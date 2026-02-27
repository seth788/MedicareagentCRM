"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
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

  await serviceSupabase.from("organization_audit_log").insert({
    organization_id: org.id,
    action: parentOrgId ? "sub_agency_created" : "organization_created",
    performed_by: user.id,
    details: parentOrgId ? { parent_org_id: parentOrgId } : { org_name: name },
  })

  /* Create static invite links (one per role) for the new org */
  const { randomBytes } = await import("crypto")
  const roles = ["agent", "loa_agent", "community_agent", "agency", "staff"] as const
  for (const role of roles) {
    const token = randomBytes(32).toString("base64url")
    await serviceSupabase.from("organization_invites").insert({
      organization_id: org.id,
      role,
      invite_token: token,
      created_by: user.id,
    })
  }

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
