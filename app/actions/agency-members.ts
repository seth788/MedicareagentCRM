"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { sendMemberRemovedNotification, sendDashboardAccessGranted, sendDashboardAccessRevoked, sendRoleChanged, sendAgentTransferred } from "@/lib/emails/organization"

async function requireDashboardAccess(organizationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: member } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("has_dashboard_access", true)
    .eq("status", "active")
    .single()

  if (!member) throw new Error("You do not have dashboard access")
  return { supabase, userId: user.id, isOwner: member.role === "owner" }
}

/** Top-line can manage downline; sub-agency owners can only manage their own org */
async function requireCanManageOrg(organizationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: member } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("has_dashboard_access", true)
    .eq("status", "active")
    .single()

  if (member && member.role === "owner") {
    return { userId: user.id, canManage: true }
  }

  const { data: canInvite } = await supabase.rpc("can_invite_to_organization_rpc", {
    p_org_id: organizationId,
  })
  if (canInvite) {
    return { userId: user.id, canManage: true }
  }

  throw new Error("You do not have permission to manage this agency")
}

async function isOrgOwner(organizationId: string, userId: string) {
  const supabase = await createClient()
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", organizationId)
    .single()
  return org?.owner_id === userId
}

export async function removeMember(
  organizationId: string,
  targetUserId: string
): Promise<{ error?: string }> {
  try {
    const { userId } = await requireCanManageOrg(organizationId)

    const serviceSupabase = createServiceRoleClient()
    const { data: org } = await serviceSupabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single()

    const { error } = await serviceSupabase
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)

    if (error) return { error: error.message }

    await serviceSupabase.from("organization_audit_log").insert({
      organization_id: organizationId,
      action: "member_removed",
      target_user_id: targetUserId,
      performed_by: userId,
    })

    const { data: targetUser } = await serviceSupabase.auth.admin.getUserById(targetUserId)
    if (targetUser?.user?.email && org?.name) {
      await sendMemberRemovedNotification({
        toEmail: targetUser.user.email,
        orgName: org.name,
      })
    }

    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to remove member" }
  }
}

export async function updateMemberDashboardAccess(
  organizationId: string,
  targetUserId: string,
  hasDashboardAccess: boolean
): Promise<{ error?: string }> {
  try {
    const { userId } = await requireCanManageOrg(organizationId)

    const serviceSupabase = createServiceRoleClient()
    const { error } = await serviceSupabase
      .from("organization_members")
      .update({ has_dashboard_access: hasDashboardAccess })
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)

    if (error) return { error: error.message }

    await serviceSupabase.from("organization_audit_log").insert({
      organization_id: organizationId,
      action: hasDashboardAccess ? "dashboard_access_granted" : "dashboard_access_revoked",
      target_user_id: targetUserId,
      performed_by: userId,
    })

    const { data: org } = await serviceSupabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single()
    const { data: targetUser } = await serviceSupabase.auth.admin.getUserById(targetUserId)
    if (targetUser?.user?.email && org?.name) {
      if (hasDashboardAccess) {
        await sendDashboardAccessGranted({
          toEmail: targetUser.user.email,
          orgName: org.name,
        })
      } else {
        await sendDashboardAccessRevoked({
          toEmail: targetUser.user.email,
          orgName: org.name,
        })
      }
    }

    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update" }
  }
}

export async function updateMemberRole(
  organizationId: string,
  targetUserId: string,
  newRole: string
): Promise<{ error?: string }> {
  try {
    await requireCanManageOrg(organizationId)

    const validRoles = ["agent", "loa_agent", "community_agent", "agency", "staff"]
    if (!validRoles.includes(newRole)) return { error: "Invalid role" }

    const serviceSupabase = createServiceRoleClient()
    const rolePerms: Record<string, { has_dashboard_access: boolean; can_view_agency_book: boolean; agency_can_view_book: boolean; is_producing: boolean }> = {
      staff: { has_dashboard_access: true, can_view_agency_book: true, agency_can_view_book: true, is_producing: false },
      agent: { has_dashboard_access: false, can_view_agency_book: false, agency_can_view_book: false, is_producing: true },
      loa_agent: { has_dashboard_access: false, can_view_agency_book: false, agency_can_view_book: true, is_producing: true },
      community_agent: { has_dashboard_access: false, can_view_agency_book: true, agency_can_view_book: true, is_producing: true },
      agency: { has_dashboard_access: false, can_view_agency_book: false, agency_can_view_book: true, is_producing: true },
    }
    const perms = rolePerms[newRole]

    const { data: current } = await serviceSupabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)
      .single()

    const { error } = await serviceSupabase
      .from("organization_members")
      .update({
        role: newRole,
        has_dashboard_access: perms.has_dashboard_access,
        can_view_agency_book: perms.can_view_agency_book,
        agency_can_view_book: perms.agency_can_view_book,
        is_producing: perms.is_producing,
      })
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)

    if (error) return { error: error.message }

    const { data: { user } } = await createClient().then((c) => c.auth.getUser())
    if (user) {
      await serviceSupabase.from("organization_audit_log").insert({
        organization_id: organizationId,
        action: "member_role_changed",
        target_user_id: targetUserId,
        performed_by: user.id,
        details: { old_role: current?.role, new_role: newRole },
      })
      const { data: org } = await serviceSupabase.from("organizations").select("name").eq("id", organizationId).single()
      const { data: targetUser } = await serviceSupabase.auth.admin.getUserById(targetUserId)
      if (targetUser?.user?.email && org?.name && current?.role) {
        await sendRoleChanged({
          toEmail: targetUser.user.email,
          orgName: org.name,
          oldRole: current.role,
          newRole,
        })
      }
    }

    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update role" }
  }
}

export async function reactivateMember(
  organizationId: string,
  targetUserId: string
): Promise<{ error?: string }> {
  try {
    await requireCanManageOrg(organizationId)

    const serviceSupabase = createServiceRoleClient()
    const { error } = await serviceSupabase
      .from("organization_members")
      .update({ status: "active" })
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)

    if (error) return { error: error.message }

    const { data: { user } } = await createClient().then((c) => c.auth.getUser())
    if (user) {
      await serviceSupabase.from("organization_audit_log").insert({
        organization_id: organizationId,
        action: "member_reactivated",
        target_user_id: targetUserId,
        performed_by: user.id,
      })
    }

    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reactivate" }
  }
}

export async function transferAgent(
  organizationId: string,
  targetUserId: string,
  targetSubOrgId: string
): Promise<{ error?: string }> {
  try {
    await requireCanManageOrg(organizationId)

    const serviceSupabase = createServiceRoleClient()
    const { data: currentMember } = await serviceSupabase
      .from("organization_members")
      .select("role, has_dashboard_access, can_view_agency_book, agency_can_view_book, is_producing")
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)
      .single()
    if (!currentMember) return { error: "Member not found" }

    const { data: orgIds } = await serviceSupabase.rpc("get_downline_org_ids", {
      root_org_id: organizationId,
    })
    const downlineIds = (orgIds ?? []) as string[]
    if (!downlineIds.includes(targetSubOrgId) || targetSubOrgId === organizationId) {
      return { error: "Invalid target organization" }
    }

    const { data: sourceOrg } = await serviceSupabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single()
    const { data: targetOrg } = await serviceSupabase
      .from("organizations")
      .select("name, parent_organization_id")
      .eq("id", targetSubOrgId)
      .single()
    if (!targetOrg) return { error: "Target organization not found" }
    const { data: parentOrg } = targetOrg.parent_organization_id
      ? await serviceSupabase
          .from("organizations")
          .select("name")
          .eq("id", targetOrg.parent_organization_id)
          .single()
      : { data: null }

    const { data: { user } } = await createClient().then((c) => c.auth.getUser())
    if (!user) return { error: "Unauthorized" }

    await serviceSupabase
      .from("organization_members")
      .update({ status: "inactive" })
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)

    await serviceSupabase.from("organization_members").insert({
      organization_id: targetSubOrgId,
      user_id: targetUserId,
      role: currentMember.role,
      has_dashboard_access: currentMember.has_dashboard_access,
      can_view_agency_book: currentMember.can_view_agency_book,
      agency_can_view_book: currentMember.agency_can_view_book,
      is_producing: currentMember.is_producing,
      status: "active",
      accepted_at: new Date().toISOString(),
    })

    await serviceSupabase.from("organization_audit_log").insert({
      organization_id: organizationId,
      action: "member_transferred",
      target_user_id: targetUserId,
      performed_by: user.id,
      details: { from_org: organizationId, to_org: targetSubOrgId },
    })
    await serviceSupabase.from("organization_audit_log").insert({
      organization_id: targetSubOrgId,
      action: "member_transferred_in",
      target_user_id: targetUserId,
      performed_by: user.id,
      details: { from_org: organizationId },
    })

    const { data: targetUser } = await serviceSupabase.auth.admin.getUserById(targetUserId)
    if (targetUser?.user?.email && sourceOrg?.name && targetOrg?.name) {
      await sendAgentTransferred({
        toEmail: targetUser.user.email,
        oldAgencyName: sourceOrg.name,
        newAgencyName: targetOrg.name,
        parentOrgName: parentOrg?.name ?? sourceOrg.name,
      })
    }

    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to transfer" }
  }
}
