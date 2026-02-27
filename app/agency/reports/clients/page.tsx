import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { ClientsReportClient } from "@/components/agency/clients-report-client"

export default async function ClientsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; start?: string; end?: string; sub_org?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency/reports/clients")

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId =
    params.org && dashboardOrgs.some((o) => o.id === params.org) ? params.org : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const now = new Date()
  const startDefault = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const endDefault = new Date().toISOString().slice(0, 10)
  const start = params.start || startDefault
  const end = params.end || endDefault

  const serviceSupabase = createServiceRoleClient()
  const { data: orgAgentIds } = await serviceSupabase.rpc("get_downline_agent_ids", {
    root_org_id: effectiveOrgId,
  })
  let targetAgentIds = (orgAgentIds ?? []) as string[]
  if (params.sub_org) {
    const { data: subAgentIds } = await serviceSupabase.rpc("get_downline_agent_ids", {
      root_org_id: params.sub_org,
    })
    targetAgentIds = (subAgentIds ?? []) as string[]
  }

  const { data: clients } = await serviceSupabase
    .from("clients")
    .select("id, agent_id, status, created_at")
    .in("agent_id", targetAgentIds)

  const clientList = clients ?? []
  const monthStart = start
  const monthEnd = end + "T23:59:59"

  const byAgent: Record<
    string,
    { total: number; new: number; active: number; lead: number; inactive: number }
  > = {}
  for (const c of clientList) {
    if (!byAgent[c.agent_id]) {
      byAgent[c.agent_id] = { total: 0, new: 0, active: 0, lead: 0, inactive: 0 }
    }
    byAgent[c.agent_id].total++
    const status = (c.status as string) ?? "active"
    if (status === "active") byAgent[c.agent_id].active++
    else if (status === "lead") byAgent[c.agent_id].lead++
    else byAgent[c.agent_id].inactive++
    if (c.created_at >= monthStart && c.created_at <= monthEnd) {
      byAgent[c.agent_id].new++
    }
  }

  const { data: profiles } = await serviceSupabase
    .from("profiles")
    .select("id, display_name")
    .in("id", Object.keys(byAgent))
  const { data: members } = await serviceSupabase
    .from("organization_members")
    .select("user_id, organization_id")
    .in("user_id", Object.keys(byAgent))
  const orgIds = [...new Set((members ?? []).map((m) => m.organization_id))]
  const { data: orgs } = await serviceSupabase.from("organizations").select("id, name").in("id", orgIds)
  const memberToOrg = new Map((members ?? []).map((m) => [m.user_id, m.organization_id]))
  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]))

  const rows = Object.entries(byAgent).map(([agentId, counts]) => ({
    agentId,
    agentName: profileMap.get(agentId) ?? "Unknown",
    agencyName: orgMap.get(memberToOrg.get(agentId) ?? "") ?? "",
    ...counts,
  }))
  rows.sort((a, b) => a.agentName.localeCompare(b.agentName))

  const { data: childOrgs } = await serviceSupabase.rpc("get_downline_org_ids", {
    root_org_id: effectiveOrgId,
  })
  const childIds = ((childOrgs ?? []) as string[]).filter((id) => id !== effectiveOrgId)
  const { data: subOrgs } =
    childIds.length > 0
      ? await serviceSupabase.from("organizations").select("id, name").in("id", childIds)
      : { data: [] }

  return (
    <div className="p-6">
      <ClientsReportClient
        organizationId={effectiveOrgId}
        rows={rows}
        subOrgs={subOrgs ?? []}
        defaultStart={start}
        defaultEnd={end}
        defaultSubOrg={params.sub_org || null}
      />
    </div>
  )
}
