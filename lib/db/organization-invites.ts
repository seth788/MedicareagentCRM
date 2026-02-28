import { createServiceRoleClient } from "@/lib/supabase/server"

export async function getInviteByToken(token: string) {
  const supabase = createServiceRoleClient()
  // Select only base columns - invite_type, target_organization_id, subagency_name
  // are from a later migration and may not exist yet
  const { data: invite, error } = await supabase
    .from("organization_invites")
    .select("id, organization_id, role, status, expires_at")
    .eq("invite_token", token)
    .single()

  if (error || !invite) return null
  if (!["pending", "opened"].includes(invite.status)) return null
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", invite.organization_id)
    .single()

  if (!org) return null

  // Extended columns (invite_type, target_organization_id, subagency_name) from migration 20260228161000.
  // If that migration hasn't run, the select fails - we default to agent_join.
  let inviteType = "agent_join"
  let targetOrganizationId: string | null = null
  let subagencyName: string | null = null
  const { data: ext } = await supabase
    .from("organization_invites")
    .select("invite_type, target_organization_id, subagency_name")
    .eq("id", invite.id)
    .maybeSingle()
  if (ext) {
    inviteType = (ext.invite_type as string) || "agent_join"
    targetOrganizationId = ext.target_organization_id as string | null
    subagencyName = (ext.subagency_name as string) || null
  }

  let targetOrganizationName: string | null = null
  if (targetOrganizationId) {
    const { data: targetOrg } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", targetOrganizationId)
      .single()
    targetOrganizationName = targetOrg?.name ?? null
  }

  return {
    inviteId: invite.id,
    organizationId: invite.organization_id,
    organizationName: org.name,
    role: invite.role,
    status: invite.status,
    inviteType,
    targetOrganizationId,
    targetOrganizationName,
    subagencyName,
    isSubagencyCreation: inviteType === "subagency_creation",
  }
}

export async function markInviteOpened(token: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("organization_invites")
    .update({ status: "opened" })
    .eq("invite_token", token)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  return !error && !!data
}

export async function isUserMemberOfOrg(userId: string, organizationId: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single()
  return !!data
}
