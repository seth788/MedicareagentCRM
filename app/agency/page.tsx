import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { getAgencyDashboardMetrics, getValidParentOrgsForSubAgency } from "@/lib/db/agency"
import { getPendingSubagencyRequests } from "@/app/actions/subagency-requests-admin"
import { SubagencyRequestsCard } from "@/components/agency/subagency-requests-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, FileText, Calendar, Building2 } from "@/components/icons"

export default async function AgencyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency")

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId = orgId && dashboardOrgs.some((o) => o.id === orgId) ? orgId : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const [
    { metrics, subAgencies },
    currentOrgData,
    pendingRequests,
    parentOrgs,
  ] = await Promise.all([
    getAgencyDashboardMetrics(effectiveOrgId),
    (async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from("organizations")
        .select("id, parent_organization_id")
        .eq("id", effectiveOrgId)
        .single()
      return data
    })(),
    getPendingSubagencyRequests(effectiveOrgId),
    getValidParentOrgsForSubAgency(effectiveOrgId),
  ])
  const currentOrg = dashboardOrgs.find((o) => o.id === effectiveOrgId)
  const orgParam = `?org=${effectiveOrgId}`
  const isRootOrg = !currentOrgData?.parent_organization_id

  const kpis = [
    { label: "Total Agents", value: metrics.totalAgents, subtitle: "Across organization", icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Total Clients", value: metrics.totalClients, subtitle: "Enrolled in plans", icon: UserPlus, color: "text-success", bgColor: "bg-success/10" },
    { label: "Active Policies", value: metrics.totalActivePolicies, subtitle: "Current coverage", icon: FileText, color: "text-chart-3", bgColor: "bg-chart-3/10" },
    { label: "New Clients This Month", value: metrics.newClientsThisMonth, subtitle: "Recently enrolled", icon: Calendar, color: "text-chart-2", bgColor: "bg-chart-2/10" },
    { label: "Policies This Month", value: metrics.policiesWrittenThisMonth, subtitle: "Written this period", icon: FileText, color: "text-chart-4", bgColor: "bg-chart-4/10" },
  ]

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-1">
        <h2 className="text-base font-semibold text-foreground sm:text-xl">
          {currentOrg?.name ?? "Agency"} at a Glance
        </h2>
        <p className="text-sm text-muted-foreground">
          Overview of your agency&apos;s performance, agents, and sub-organizations.
        </p>
      </div>

      <div className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k) => (
            <Card key={k.label} className="relative overflow-hidden">
              <CardContent className="flex items-start gap-4 p-4 sm:p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.bgColor}`}>
                  <k.icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{k.label}</p>
                  <p className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {subAgencies.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Building2 className="h-4 w-4 text-primary" />
                Sub-Agencies
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {subAgencies.length} total
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">Agencies under your organization</p>
            <div className="space-y-2">
              {subAgencies.map((sub) => (
                <div
                  key={sub.id}
                  className="flex min-h-[40px] items-center justify-between rounded-lg border px-4 py-3 sm:px-5"
                >
                  <span className="font-medium text-foreground">{sub.name}</span>
                  <span className="text-sm text-muted-foreground">{sub.agentCount} agents</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isRootOrg && pendingRequests.length > 0 && (
        <SubagencyRequestsCard
          requests={pendingRequests}
          rootOrgId={effectiveOrgId}
          parentOrgs={parentOrgs}
        />
      )}
    </div>
  )
}
