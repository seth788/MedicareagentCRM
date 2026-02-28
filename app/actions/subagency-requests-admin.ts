"use server"

import { randomBytes } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { getRootOrgId } from "@/lib/db/agency"
import { getAppUrl } from "@/lib/emails/soa"

export async function getPendingSubagencyRequests(rootOrgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("subagency_creation_requests")
    .select("id, requesting_user_id, status, requested_at, reviewed_at, placement_parent_organization_id")
    .eq("root_organization_id", rootOrgId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })

  if (!data?.length) return []

  const userIds = [...new Set(data.map((r) => r.requesting_user_id))]
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds)
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]))

  return data.map((r) => ({
    id: r.id,
    requestingUserId: r.requesting_user_id,
    requestingDisplayName: profileMap.get(r.requesting_user_id) ?? "Unknown",
    status: r.status,
    requestedAt: r.requested_at,
    placementParentOrgId: r.placement_parent_organization_id,
  }))
}

export async function declineSubagencyRequest(
  requestId: string,
  rootOrgId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: member } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", rootOrgId)
    .eq("user_id", user.id)
    .eq("has_dashboard_access", true)
    .eq("status", "active")
    .single()

  if (!member) return { error: "You do not have dashboard access to approve requests" }

  const { data: request } = await supabase
    .from("subagency_creation_requests")
    .select("requesting_user_id")
    .eq("id", requestId)
    .eq("root_organization_id", rootOrgId)
    .eq("status", "pending")
    .single()

  const { error } = await supabase
    .from("subagency_creation_requests")
    .update({
      status: "declined",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("root_organization_id", rootOrgId)
    .eq("status", "pending")

  if (error) return { error: error.message }

  if (request?.requesting_user_id) {
    const serviceSupabase = (await import("@/lib/supabase/server")).createServiceRoleClient()
    const { data: reqUser } = await serviceSupabase.auth.admin.getUserById(request.requesting_user_id)
    const { data: rootOrg } = await serviceSupabase
      .from("organizations")
      .select("name")
      .eq("id", rootOrgId)
      .single()
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("display_name")
      .eq("id", request.requesting_user_id)
      .single()
    const email = reqUser?.user?.email
    if (email && rootOrg?.name) {
      const { sendSubagencyRequestDeclined } = await import("@/lib/emails/organization")
      await sendSubagencyRequestDeclined({
        toEmail: email,
        agentName: profile?.display_name ?? "Agent",
        orgName: rootOrg.name,
      })
    }
  }

  return {}
}

export async function approveSubagencyRequest(
  requestId: string,
  rootOrgId: string,
  placementParentOrgId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const serviceSupabase = (await import("@/lib/supabase/server")).createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: member } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", rootOrgId)
    .eq("user_id", user.id)
    .eq("has_dashboard_access", true)
    .eq("status", "active")
    .single()

  if (!member) return { error: "You do not have dashboard access to approve requests" }

  const { data: request } = await serviceSupabase
    .from("subagency_creation_requests")
    .select("requesting_user_id")
    .eq("id", requestId)
    .eq("root_organization_id", rootOrgId)
    .eq("status", "pending")
    .single()

  if (!request) return { error: "Request not found or already processed" }

  const token = randomBytes(32).toString("base64url")
  const { data: invite, error: inviteError } = await serviceSupabase
    .from("organization_invites")
    .insert({
      organization_id: rootOrgId,
      role: "agency",
      invite_token: token,
      invite_type: "subagency_creation",
      target_organization_id: placementParentOrgId,
      created_by: user.id,
      status: "pending",
    })
    .select("id")
    .single()

  if (inviteError || !invite) return { error: inviteError?.message ?? "Failed to create invite" }

  await serviceSupabase
    .from("subagency_creation_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      placement_parent_organization_id: placementParentOrgId,
      invite_id: invite.id,
    })
    .eq("id", requestId)

  const inviteUrl = `${getAppUrl()}/invite/${token}`
  const { data: parentOrg } = await serviceSupabase
    .from("organizations")
    .select("name")
    .eq("id", placementParentOrgId)
    .single()
  const { sendSubagencyInvite } = await import("@/lib/emails/organization")
  const { data: reqUser } = await serviceSupabase.auth.admin.getUserById(request.requesting_user_id)
  const email = reqUser?.user?.email
  if (email) {
    await sendSubagencyInvite({
      toEmail: email,
      placementParentName: parentOrg?.name ?? "your agency",
      inviteUrl,
    })
  }

  return {}
}
