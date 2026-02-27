import { createServiceRoleClient } from "@/lib/supabase/server"

export async function getInviteByToken(token: string) {
  const supabase = createServiceRoleClient()
  const { data: invite, error } = await supabase
    .from("organization_invites")
    .select("id, organization_id, role, status, expires_at, max_uses, times_used")
    .eq("invite_token", token)
    .single()

  if (error || !invite) return null
  if (invite.status !== "active") return null
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null
  if (invite.max_uses != null && invite.times_used >= invite.max_uses) return null

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", invite.organization_id)
    .single()

  if (!org) return null

  return {
    inviteId: invite.id,
    organizationId: invite.organization_id,
    organizationName: org.name,
    role: invite.role,
  }
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
