import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { RenewalsReportClient } from "@/components/agency/renewals-report-client"

export default async function RenewalsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; start?: string; end?: string; sub_org?: string; plan_type?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency/reports/renewals")

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId =
    params.org && dashboardOrgs.some((o) => o.id === params.org) ? params.org : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const now = new Date()
  const defaultEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const startDefault = now.toISOString().slice(0, 10)
  const endDefault = defaultEnd.toISOString().slice(0, 10)
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
    .select("id, first_name, last_name, agent_id")
    .in("agent_id", targetAgentIds)
  const clientIds = (clients ?? []).map((c) => c.id)
  const clientMap = new Map((clients ?? []).map((c) => [c.id, c]))

  let covQuery = serviceSupabase
    .from("client_coverages")
    .select("id, client_id, plan_type, plan_name, carrier, effective_date")
    .in("client_id", clientIds)
  if (params.plan_type && params.plan_type !== "all") {
    covQuery = covQuery.eq("plan_type", params.plan_type)
  }
  const { data: coverages } = await covQuery

  const rows: {
    clientName: string
    agentId: string
    agentName: string
    agencyName: string
    planName: string
    carrier: string
    planType: string
    effectiveDate: string
    renewalDate: string
  }[] = []
  for (const c of coverages ?? []) {
    const client = clientMap.get(c.client_id)
    if (!client) continue
    const effDate = new Date(c.effective_date)
    const renewalDate = new Date(effDate)
    renewalDate.setFullYear(renewalDate.getFullYear() + 1)
    const renewalStr = renewalDate.toISOString().slice(0, 10)
    if (renewalStr >= start && renewalStr <= end) {
      rows.push({
        clientName: `${client.first_name} ${client.last_name}`.trim(),
        agentId: client.agent_id,
        agentName: "",
        agencyName: "",
        planName: c.plan_name ?? "",
        carrier: c.carrier ?? "",
        planType: c.plan_type ?? "",
        effectiveDate: c.effective_date,
        renewalDate: renewalStr,
      })
    }
  }

  const agentIds = [...new Set(rows.map((r) => r.agentId))]
  const { data: profiles } = await serviceSupabase
    .from("profiles")
    .select("id, display_name")
    .in("id", agentIds)
  const { data: members } = await serviceSupabase
    .from("organization_members")
    .select("user_id, organization_id")
    .in("user_id", agentIds)
  const orgIds = [...new Set((members ?? []).map((m) => m.organization_id))]
  const { data: orgs } = await serviceSupabase.from("organizations").select("id, name").in("id", orgIds)
  const memberToOrg = new Map((members ?? []).map((m) => [m.user_id, m.organization_id]))
  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]))

  for (const r of rows) {
    r.agentName = profileMap.get(r.agentId) ?? "Unknown"
    r.agencyName = orgMap.get(memberToOrg.get(r.agentId) ?? "") ?? ""
  }
  rows.sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))

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
      <RenewalsReportClient
        organizationId={effectiveOrgId}
        rows={rows}
        subOrgs={subOrgs ?? []}
        defaultStart={start}
        defaultEnd={end}
        defaultSubOrg={params.sub_org || null}
        defaultPlanType={params.plan_type || "all"}
      />
    </div>
  )
}
