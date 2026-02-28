"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserMemberOrgs, getUserMemberOrgsWithRoles, ROLES_CAN_CREATE_AGENCY } from "@/lib/db/organizations"
import { getRootOrgId, getValidParentOrgsForSubAgency } from "@/lib/db/agency"
import { sendSubAgencyCreated } from "@/lib/emails/organization"

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const name = (formData.get("name") as string)?.trim()
  const orgType = formData.get("organization_type") as string
  const parentOrgId = (formData.get("parent_org_id") as string)?.trim() || null

  if (!name) return { error: "Organization name is required" }
  if (!["agency", "sub_agency"].includes(orgType)) return { error: "Invalid organization type" }

  const memberOrgs = await getUserMemberOrgs(user.id)
  const memberOrgsWithRoles = await getUserMemberOrgsWithRoles(user.id)
  const userHasAgency = memberOrgs.length > 0

  // Only plain agents (and agency/owner) can create. LOA and community agents cannot.
  const canCreateAgency = memberOrgsWithRoles.length === 0 || memberOrgsWithRoles.some((m) => ROLES_CAN_CREATE_AGENCY.includes(m.role as (typeof ROLES_CAN_CREATE_AGENCY)[number]))
  if (!canCreateAgency) return { error: "LOA and community agents cannot create agencies. Only agents with full producing status can create or own sub-agencies." }

  // Agents in an agency (agent/agency role) can only create sub-agencies; they must choose a valid direct upline
  if (userHasAgency) {
    if (orgType !== "sub_agency") return { error: "You can only create sub-agencies under your existing agency" }
    if (!parentOrgId) return { error: "Please select a direct upline (parent agency)" }
    const rootOrgId = await getRootOrgId(memberOrgs[0].id)
    const validParents = await getValidParentOrgsForSubAgency(rootOrgId)
    const validParentIds = new Set(validParents.map((p) => p.id))
    if (!validParentIds.has(parentOrgId)) return { error: "Invalid parent agency selected" }
  } else if (orgType === "sub_agency" && !parentOrgId) {
    return { error: "Sub-agency requires a parent organization" }
  }

  const serviceSupabase = (await import("@/lib/supabase/server")).createServiceRoleClient()

  const { data: org, error: orgError } = await serviceSupabase
    .from("organizations")
    .insert({
      name,
      organization_type: orgType,
      owner_id: user.id,
      parent_organization_id: parentOrgId || null,
    })
    .select("id")
    .single()

  if (orgError) return { error: orgError.message }
  if (!org) return { error: "Failed to create organization" }

  await serviceSupabase.from("organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
    has_dashboard_access: true,
    can_view_agency_book: true,
    is_producing: false,
    status: "active",
    accepted_at: new Date().toISOString(),
  })

  // When creating a sub-agency, move the agent out of their previous org(s) so they're under the new sub-agency
  if (parentOrgId && memberOrgs.length > 0) {
    const orgIdsToRemove = memberOrgs.map((o) => o.id)
    await serviceSupabase
      .from("organization_members")
      .delete()
      .eq("user_id", user.id)
      .in("organization_id", orgIdsToRemove)
  }

  await serviceSupabase.from("organization_audit_log").insert({
    organization_id: org.id,
    action: parentOrgId ? "sub_agency_created" : "organization_created",
    performed_by: user.id,
    details: parentOrgId ? { parent_org_id: parentOrgId } : { org_name: name },
  })

  if (parentOrgId) {
    await serviceSupabase.from("organization_audit_log").insert({
      organization_id: parentOrgId,
      action: "sub_agency_created",
      target_user_id: user.id,
      performed_by: user.id,
      details: { sub_agency_id: org.id, sub_agency_name: name },
    })
    const { data: parentOrg } = await serviceSupabase
      .from("organizations")
      .select("name, owner_id")
      .eq("id", parentOrgId)
      .single()
    if (parentOrg?.owner_id) {
      const { data: ownerUser } = await serviceSupabase.auth.admin.getUserById(parentOrg.owner_id)
      if (ownerUser?.user?.email && parentOrg.name) {
        await sendSubAgencyCreated({
          toEmail: ownerUser.user.email,
          parentOrgName: parentOrg.name,
          subAgencyName: name,
        })
      }
    }
  }

  redirect(`/agency?org=${org.id}`)
}
