"use server"

import { randomBytes } from "crypto"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAppUrl } from "@/lib/emails/soa"

const ORG_ROLES = ["agent", "loa_agent", "community_agent", "agency", "staff"] as const
export type OrgInviteRole = (typeof ORG_ROLES)[number]

async function requireDashboardAccess(organizationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: member } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("has_dashboard_access", true)
    .eq("status", "active")
    .single()

  if (!member) throw new Error("You do not have dashboard access to this organization")
  return { supabase, userId: user.id }
}

async function requireCanInviteToOrg(organizationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: canInvite, error } = await supabase.rpc("can_invite_to_organization_rpc", {
    p_org_id: organizationId,
  })
  if (error || !canInvite) {
    throw new Error("You do not have permission to invite to that agency")
  }
  return { supabase, userId: user.id }
}

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    organizationId: string
    action: string
    performedBy: string
    targetUserId?: string | null
    details?: Record<string, unknown>
  }
) {
  await supabase.from("organization_audit_log").insert({
    organization_id: params.organizationId,
    action: params.action,
    performed_by: params.performedBy,
    target_user_id: params.targetUserId ?? null,
    details: params.details ?? null,
  })
}

export async function createInviteWithEmail(
  organizationId: string,
  role: OrgInviteRole,
  email: string
): Promise<{ error?: string }> {
  try {
    if (!ORG_ROLES.includes(role)) {
      return { error: "Invalid role" }
    }
    const emailTrimmed = (email || "").trim().toLowerCase()
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return { error: "A valid email address is required" }
    }
    const { userId } = await requireCanInviteToOrg(organizationId)

    const serviceSupabase = (await import("@/lib/supabase/server")).createServiceRoleClient()
    const token = randomBytes(32).toString("base64url")
    const { data: invite, error } = await serviceSupabase
      .from("organization_invites")
      .insert({
        organization_id: organizationId,
        role,
        invite_token: token,
        invite_email: emailTrimmed,
        created_by: userId,
        status: "pending",
      })
      .select("id")
      .single()

    if (error) return { error: error.message }
    if (!invite) return { error: "Failed to create invite" }

    const { data: org } = await serviceSupabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single()

    const baseUrl = getAppUrl()
    const inviteUrl = `${baseUrl}/invite/${token}`
    const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

    const { sendOrganizationInvite } = await import("@/lib/emails/organization")
    const sendResult = await sendOrganizationInvite({
      toEmail: emailTrimmed,
      orgName: org?.name ?? "the agency",
      role: roleLabel,
      inviteUrl,
    })

    if (!sendResult.ok) {
      return { error: sendResult.error }
    }

    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create invite" }
  }
}

export async function getOrgInviteLinks(organizationId: string) {
  try {
    await requireDashboardAccess(organizationId)
    const supabase = await createClient()

    const { data: invites, error } = await supabase
      .from("organization_invites")
      .select("id, role, invite_email, status, created_at")
      .eq("organization_id", organizationId)
      .in("status", ["pending", "opened"])
      .order("created_at", { ascending: false })

    if (error) return { error: error.message, invites: [] }

    const result = (invites ?? []).map((inv) => ({
      id: inv.id,
      role: inv.role,
      email: inv.invite_email ?? "",
      status: inv.status,
      createdAt: inv.created_at,
      organizationId: organizationId,
    }))

    return { invites: result }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch invites", invites: [] }
  }
}

/** Fetches pending invites for org and all its descendants. Use when displaying members table so invites to subagencies appear. */
export async function getOrgInviteLinksForTree(organizationId: string) {
  try {
    await requireDashboardAccess(organizationId)
    const serviceSupabase = (await import("@/lib/supabase/server")).createServiceRoleClient()
    const { data: downlineIds } = await serviceSupabase.rpc("get_downline_org_ids", {
      root_org_id: organizationId,
    })
    const orgIds = (downlineIds ?? []) as string[]
    if (orgIds.length === 0) return { invites: [] }

    const { data: invites, error } = await serviceSupabase
      .from("organization_invites")
      .select("id, role, invite_email, status, created_at, organization_id")
      .in("organization_id", orgIds)
      .in("status", ["pending", "opened"])
      .order("created_at", { ascending: false })

    if (error) return { error: error.message, invites: [] }

    const orgIdsToFetch = [...new Set((invites ?? []).map((i) => i.organization_id).filter(Boolean))]
    const { data: orgs } =
      orgIdsToFetch.length > 0
        ? await serviceSupabase.from("organizations").select("id, name").in("id", orgIdsToFetch)
        : { data: [] }
    const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]))

    const result = (invites ?? []).map((inv) => ({
      id: inv.id,
      role: inv.role,
      email: inv.invite_email ?? "",
      status: inv.status,
      createdAt: inv.created_at,
      organizationId: inv.organization_id,
      organizationName: orgMap.get(inv.organization_id) ?? "",
    }))

    return { invites: result }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch invites", invites: [] }
  }
}

export async function revokeInvite(
  inviteOrganizationId: string,
  inviteId: string
): Promise<{ error?: string }> {
  try {
    await requireCanInviteToOrg(inviteOrganizationId)
    const serviceSupabase = (await import("@/lib/supabase/server")).createServiceRoleClient()
    const { error } = await serviceSupabase
      .from("organization_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId)
      .eq("organization_id", inviteOrganizationId)
      .in("status", ["pending", "opened"])

    if (error) return { error: error.message }
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to revoke invite" }
  }
}

const ROLE_PERMISSIONS: Record<
  OrgInviteRole,
  { has_dashboard_access: boolean; can_view_agency_book: boolean; agency_can_view_book: boolean; is_producing: boolean }
> = {
  staff: { has_dashboard_access: true, can_view_agency_book: true, agency_can_view_book: true, is_producing: false },
  agent: { has_dashboard_access: false, can_view_agency_book: false, agency_can_view_book: false, is_producing: true },
  loa_agent: { has_dashboard_access: false, can_view_agency_book: false, agency_can_view_book: true, is_producing: true },
  community_agent: { has_dashboard_access: false, can_view_agency_book: true, agency_can_view_book: true, is_producing: true },
  agency: { has_dashboard_access: false, can_view_agency_book: false, agency_can_view_book: true, is_producing: true },
}

export async function acceptInvite(
  token: string,
  subagencyNameFromAgent?: string,
  agencyNameFromAgent?: string
): Promise<{
  error?: string
  setupAgency?: boolean
  orgName?: string
  createdSubagencyId?: string
}> {
  const supabase = await createClient()
  const serviceSupabase = (await import("@/lib/supabase/server")).createServiceRoleClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "You must be logged in to accept an invite" }

  const { data: invite, error: inviteError } = await serviceSupabase
    .from("organization_invites")
    .select("id, organization_id, role, status, expires_at, invite_type, target_organization_id, subagency_name")
    .eq("invite_token", token)
    .single()

  if (inviteError || !invite) return { error: "This invite link is no longer valid." }
  if (!["pending", "opened"].includes(invite.status)) return { error: "This invite link is no longer valid." }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return { error: "This invite link is no longer valid." }

  const isSubagencyCreation = invite.invite_type === "subagency_creation"
  const targetOrgId = invite.target_organization_id as string | null
  const subagencyName =
    (subagencyNameFromAgent?.trim()) ||
    (invite.subagency_name as string)?.trim()

  if (isSubagencyCreation) {
    if (!targetOrgId) return { error: "Invalid subagency invite: missing placement." }
    if (!subagencyName) return { error: "Please enter a name for your subagency." }
    const { getUserMemberOrgs } = await import("@/lib/db/organizations")
    const memberOrgs = await getUserMemberOrgs(user.id)

    const { data: newOrg, error: orgError } = await serviceSupabase
      .from("organizations")
      .insert({
        name: subagencyName,
        organization_type: "sub_agency",
        owner_id: user.id,
        parent_organization_id: targetOrgId,
      })
      .select("id, name")
      .single()

    if (orgError) return { error: orgError.message }
    if (!newOrg) return { error: "Failed to create subagency" }

    await serviceSupabase.from("organization_members").insert({
      organization_id: newOrg.id,
      user_id: user.id,
      role: "owner",
      has_dashboard_access: true,
      can_view_agency_book: true,
      is_producing: false,
      status: "active",
      accepted_at: new Date().toISOString(),
    })

    if (memberOrgs.length > 0) {
      await serviceSupabase
        .from("organization_members")
        .delete()
        .eq("user_id", user.id)
        .in("organization_id", memberOrgs.map((o) => o.id))
    }

    await serviceSupabase.from("organization_invites").update({ status: "accepted" }).eq("id", invite.id)

    await serviceSupabase
      .from("subagency_creation_requests")
      .update({ created_subagency_id: newOrg.id })
      .eq("invite_id", invite.id)

    await serviceSupabase.from("organization_audit_log").insert({
      organization_id: newOrg.id,
      action: "sub_agency_created",
      performed_by: user.id,
      details: { parent_org_id: targetOrgId },
    })

    const { data: parentOrg } = await serviceSupabase.from("organizations").select("name, owner_id").eq("id", targetOrgId).single()
    if (parentOrg?.owner_id) {
      try {
        const { data: ownerUser } = await serviceSupabase.auth.admin.getUserById(parentOrg.owner_id)
        if (ownerUser?.user?.email) {
          const { sendSubAgencyCreated } = await import("@/lib/emails/organization")
          await sendSubAgencyCreated({
            toEmail: ownerUser.user.email,
            parentOrgName: parentOrg.name,
            subAgencyName: newOrg.name,
          })
        }
      } catch {
        // Don't block subagency creation if email fails
      }
    }

    return { createdSubagencyId: newOrg.id }
  }

  const role = invite.role as OrgInviteRole
  if (!ORG_ROLES.includes(role)) return { error: "Invalid invite" }

  // Agency invite: create their sub-agency with the name they provide (like subagency creation)
  if (role === "agency") {
    const agencyName = (agencyNameFromAgent?.trim()) || ""
    if (!agencyName) return { error: "Please enter a name for your agency." }

    const { getUserMemberOrgs } = await import("@/lib/db/organizations")
    const memberOrgs = await getUserMemberOrgs(user.id)
    const parentOrgId = invite.organization_id

    const { data: newOrg, error: orgError } = await serviceSupabase
      .from("organizations")
      .insert({
        name: agencyName,
        organization_type: "sub_agency",
        owner_id: user.id,
        parent_organization_id: parentOrgId,
      })
      .select("id, name")
      .single()

    if (orgError) return { error: orgError.message }
    if (!newOrg) return { error: "Failed to create agency" }

    await serviceSupabase.from("organization_members").insert({
      organization_id: newOrg.id,
      user_id: user.id,
      role: "owner",
      has_dashboard_access: true,
      can_view_agency_book: true,
      is_producing: false,
      status: "active",
      accepted_at: new Date().toISOString(),
    })

    if (memberOrgs.length > 0) {
      await serviceSupabase
        .from("organization_members")
        .delete()
        .eq("user_id", user.id)
        .in("organization_id", memberOrgs.map((o) => o.id))
    }

    await serviceSupabase.from("organization_invites").update({ status: "accepted" }).eq("id", invite.id)

    await serviceSupabase.from("organization_audit_log").insert({
      organization_id: newOrg.id,
      action: "sub_agency_created",
      performed_by: user.id,
      details: { parent_org_id: parentOrgId },
    })

    const { data: parentOrg } = await serviceSupabase.from("organizations").select("name, owner_id").eq("id", parentOrgId).single()
    if (parentOrg?.owner_id) {
      try {
        const { data: ownerUser } = await serviceSupabase.auth.admin.getUserById(parentOrg.owner_id)
        if (ownerUser?.user?.email) {
          const { sendSubAgencyCreated } = await import("@/lib/emails/organization")
          await sendSubAgencyCreated({
            toEmail: ownerUser.user.email,
            parentOrgName: parentOrg.name,
            subAgencyName: newOrg.name,
          })
        }
      } catch {
        // Don't block if email fails
      }
    }

    return { createdSubagencyId: newOrg.id }
  }

  const { data: existing } = await serviceSupabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", invite.organization_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  if (existing) return { error: "ALREADY_MEMBER" }

  const perms = ROLE_PERMISSIONS[role]

  const { error: insertError } = await serviceSupabase.from("organization_members").insert({
    organization_id: invite.organization_id,
    user_id: user.id,
    role,
    has_dashboard_access: perms.has_dashboard_access,
    can_view_agency_book: perms.can_view_agency_book,
    agency_can_view_book: perms.agency_can_view_book,
    is_producing: perms.is_producing,
    status: "active",
    accepted_at: new Date().toISOString(),
  })

  if (insertError) return { error: insertError.message }

  await serviceSupabase
    .from("organization_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id)

  const { data: org } = await serviceSupabase
    .from("organizations")
    .select("id, name, owner_id")
    .eq("id", invite.organization_id)
    .single()

  if (org) {
    await serviceSupabase.from("organization_audit_log").insert({
      organization_id: org.id,
      action: "member_accepted",
      target_user_id: user.id,
      performed_by: user.id,
      details: { role },
    })

    const { data: ownerUser } = await serviceSupabase.auth.admin.getUserById(org.owner_id)
    const ownerEmail = ownerUser?.user?.email
    if (ownerEmail) {
      const profile = await serviceSupabase.from("profiles").select("display_name").eq("id", user.id).single()
      const agentName = profile.data?.display_name ?? user.email ?? "An agent"
      const { sendMemberJoinedNotification } = await import("@/lib/emails/organization")
      await sendMemberJoinedNotification({
        toEmail: ownerEmail,
        agentName,
        agentEmail: user.email ?? "",
        orgName: org.name,
        role: role.replace(/_/g, " "),
      })
    }
  }

  return { setupAgency: role === "agency", orgName: org?.name }
}
