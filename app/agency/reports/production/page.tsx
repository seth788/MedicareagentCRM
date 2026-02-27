import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { ProductionReportClient } from "@/components/agency/production-report-client"

export default async function ProductionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; start?: string; end?: string; sub_org?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency/reports/production")

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId =
    params.org && dashboardOrgs.some((o) => o.id === params.org) ? params.org : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const now = new Date()
  const startDefault = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const endDefault = new Date().toISOString().slice(0, 10)

  const serviceSupabase = createServiceRoleClient()
  const { data: agentIds } = await serviceSupabase.rpc("get_downline_agent_ids", {
    root_org_id: effectiveOrgId,
  })
  const filterSubOrgId = params.sub_org || null
  let targetAgentIds = (agentIds ?? []) as string[]
  if (filterSubOrgId) {
    const { data: subAgentIds } = await serviceSupabase.rpc("get_downline_agent_ids", {
      root_org_id: filterSubOrgId,
    })
    targetAgentIds = (subAgentIds ?? []) as string[]
  }

  const start = params.start || startDefault
  const end = params.end || endDefault
  const startDate = new Date(start)
  const endDate = new Date(end)

  const { data: coverages } = await serviceSupabase
    .from("client_coverages")
    .select("client_id, plan_type, effective_date")
    .in(
      "client_id",
      (await serviceSupabase.from("clients").select("id").in("agent_id", targetAgentIds)).data?.map(
        (c) => c.id
      ) ?? []
    )
    .gte("effective_date", start)
    .lte("effective_date", end)

  const clientIds = (coverages ?? []).map((c) => c.client_id)
  const { data: clients } =
    clientIds.length > 0
      ? await serviceSupabase.from("clients").select("id, agent_id").in("id", clientIds)
      : { data: [] }
  const clientToAgent = new Map((clients ?? []).map((c) => [c.id, c.agent_id]))

  const byAgent: Record<
    string,
    { mapd: number; pdp: number; medSupp: number; dsnp: number; other: number; total: number }
  > = {}
  for (const c of coverages ?? []) {
    const agentId = clientToAgent.get(c.client_id)
    if (!agentId || !targetAgentIds.includes(agentId)) continue
    if (!byAgent[agentId]) {
      byAgent[agentId] = { mapd: 0, pdp: 0, medSupp: 0, dsnp: 0, other: 0, total: 0 }
    }
    byAgent[agentId].total++
    const pt = (c.plan_type as string) ?? ""
    if (pt === "MAPD") byAgent[agentId].mapd++
    else if (pt === "PDP") byAgent[agentId].pdp++
    else if (pt === "Med Supp") byAgent[agentId].medSupp++
    else if (pt === "DSNP") byAgent[agentId].dsnp++
    else byAgent[agentId].other++
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
      <ProductionReportClient
        organizationId={effectiveOrgId}
        rows={rows}
        subOrgs={subOrgs ?? []}
        defaultStart={start}
        defaultEnd={end}
        defaultSubOrg={filterSubOrgId}
      />
    </div>
  )
}
