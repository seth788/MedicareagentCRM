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
