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

export async function createInviteLink(
  organizationId: string,
  role: OrgInviteRole
): Promise<{ error?: string; url?: string }> {
  try {
    if (!ORG_ROLES.includes(role)) {
      return { error: "Invalid role" }
    }
    const { supabase, userId } = await requireDashboardAccess(organizationId)

    const { data: existing } = await supabase
      .from("organization_invites")
      .select("invite_token")
      .eq("organization_id", organizationId)
      .eq("role", role)
      .maybeSingle()

    let token: string
    if (existing?.invite_token) {
      token = existing.invite_token
    } else {
      token = randomBytes(32).toString("base64url")
      const { error } = await supabase.from("organization_invites").insert({
        organization_id: organizationId,
        role,
        invite_token: token,
        created_by: userId,
      })
      if (error) return { error: error.message }
    }

    const baseUrl = getAppUrl()
    const url = `${baseUrl}/invite/${token}`
    return { url }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create invite" }
  }
}

export async function getOrgInviteLinks(organizationId: string) {
  try {
    const { supabase, userId } = await requireDashboardAccess(organizationId)
    const baseUrl = getAppUrl()

    let { data: invites, error } = await supabase
      .from("organization_invites")
      .select("id, role, invite_token")
      .eq("organization_id", organizationId)

    if (error) return { error: error.message, invites: [] }

    const existingRoles = new Set((invites ?? []).map((i) => i.role))
    const missingRoles = ORG_ROLES.filter((r) => !existingRoles.has(r))

    if (missingRoles.length > 0) {
      const { randomBytes } = await import("crypto")
      for (const role of missingRoles) {
        const token = randomBytes(32).toString("base64url")
        const { data: inserted } = await supabase
          .from("organization_invites")
          .insert({
            organization_id: organizationId,
            role,
            invite_token: token,
            created_by: userId,
          })
          .select("id, role, invite_token")
          .single()
        if (inserted) invites = [...(invites ?? []), inserted]
      }
    }

    const roleOrder = ORG_ROLES
    const sorted = (invites ?? []).sort(
      (a, b) => roleOrder.indexOf(a.role as OrgInviteRole) - roleOrder.indexOf(b.role as OrgInviteRole)
    )

    const result = sorted.map((inv) => ({
      id: inv.id,
      role: inv.role,
      url: `${baseUrl}/invite/${inv.invite_token}`,
    }))

    return { invites: result }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch invites", invites: [] }
  }
}

const ROLE_PERMISSIONS: Record<
  OrgInviteRole,
  { has_dashboard_access: boolean; can_view_agency_book: boolean; agency_can_view_book: boolean; is_producing: boolean }
> = {
  staff: { has_dashboard_access: true, can_view_agency_book: true, agency_can_view_book: true, is_producing: false },
  agent: { has_dashboard_access: false, can_view_agency_book: false, agency_can_view_book: true, is_producing: true },
  loa_agent: { has_dashboard_access: false, can_view_agency_book: false, agency_can_view_book: true, is_producing: true },
  community_agent: { has_dashboard_access: false, can_view_agency_book: true, agency_can_view_book: true, is_producing: true },
  agency: { has_dashboard_access: false, can_view_agency_book: false, agency_can_view_book: true, is_producing: true },
}

export async function acceptInvite(token: string): Promise<{ error?: string; setupAgency?: boolean; orgName?: string }> {
  const supabase = await createClient()
  const serviceSupabase = (await import("@/lib/supabase/server")).createServiceRoleClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "You must be logged in to accept an invite" }

  const { data: invite, error: inviteError } = await serviceSupabase
    .from("organization_invites")
    .select("id, organization_id, role, status, expires_at, max_uses, times_used")
    .eq("invite_token", token)
    .single()

  if (inviteError || !invite) return { error: "This invite link is no longer valid." }
  if (invite.status !== "active") return { error: "This invite link is no longer valid." }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return { error: "This invite link is no longer valid." }
  if (invite.max_uses != null && invite.times_used >= invite.max_uses) return { error: "This invite link is no longer valid." }

  const role = invite.role as OrgInviteRole
  if (!ORG_ROLES.includes(role)) return { error: "Invalid invite" }

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
    .update({ times_used: invite.times_used + 1 })
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
