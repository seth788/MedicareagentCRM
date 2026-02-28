import { createClient } from "@/lib/supabase/server"

export interface DashboardOrg {
  id: string
  name: string
}

export async function getUserDashboardOrgs(userId: string): Promise<DashboardOrg[]> {
  const supabase = await createClient()
  const { data: members, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("has_dashboard_access", true)
    .eq("status", "active")

  if (error || !members?.length) return []

  const orgIds = [...new Set(members.map((m) => m.organization_id))]
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds)

  return (orgs ?? []).map((o) => ({ id: o.id, name: o.name }))
}

export interface MemberOrgWithRole {
  id: string
  name: string
  role: string
}

/** Returns orgs the user is an active member of (any role), with role. Used to determine if user can only create sub-agencies and if they're allowed to create at all. */
export async function getUserMemberOrgs(userId: string): Promise<DashboardOrg[]> {
  const supabase = await createClient()
  const { data: members, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")

  if (error || !members?.length) return []

  const orgIds = [...new Set(members.map((m) => m.organization_id))]
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds)

  return (orgs ?? []).map((o) => ({ id: o.id, name: o.name }))
}

/** Returns member orgs with roles. Only agent and agency roles can create agencies; loa_agent and community_agent cannot. */
export async function getUserMemberOrgsWithRoles(userId: string): Promise<MemberOrgWithRole[]> {
  const supabase = await createClient()
  const { data: members, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("status", "active")

  if (error || !members?.length) return []

  const orgIds = [...new Set(members.map((m) => m.organization_id))]
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds)

  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]))
  return (members ?? []).map((m) => ({
    id: m.organization_id,
    name: orgMap.get(m.organization_id) ?? "",
    role: m.role ?? "",
  }))
}

/** Only these roles can create agencies. LOA and community agents cannot. */
export const ROLES_CAN_CREATE_AGENCY = ["agent", "agency", "owner"] as const

export async function getUserAgencyBookOrgs(userId: string): Promise<DashboardOrg[]> {
  const supabase = await createClient()
  const { data: members, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("can_view_agency_book", true)
    .eq("status", "active")

  if (error || !members?.length) return []

  const orgIds = [...new Set(members.map((m) => m.organization_id))]
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds)

  return (orgs ?? []).map((o) => ({ id: o.id, name: o.name }))
}
