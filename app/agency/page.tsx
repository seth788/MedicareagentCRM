import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { getAgencyDashboardMetrics } from "@/lib/db/agency"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, FileText, Calendar } from "@/components/icons"

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

  const { metrics, subAgencies } = await getAgencyDashboardMetrics(effectiveOrgId)
  const currentOrg = dashboardOrgs.find((o) => o.id === effectiveOrgId)
  const orgParam = `?org=${effectiveOrgId}`

  const kpis = [
    { label: "Total Agents", value: metrics.totalAgents, icon: Users },
    { label: "Total Clients", value: metrics.totalClients, icon: UserPlus },
    { label: "Active Policies", value: metrics.totalActivePolicies, icon: FileText },
    { label: "New Clients This Month", value: metrics.newClientsThisMonth, icon: Calendar },
    { label: "Policies This Month", value: metrics.policiesWrittenThisMonth, icon: FileText },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{currentOrg?.name ?? "Agency"} Dashboard</h1>
        <p className="text-muted-foreground">Overview of your agency&apos;s performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {subAgencies.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Sub-Agencies</CardTitle>
            <p className="text-sm text-muted-foreground">Agencies under your organization</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subAgencies.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/agency${orgParam}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
                >
                  <span className="font-medium">{sub.name}</span>
                  <span className="text-sm text-muted-foreground">{sub.agentCount} agents</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
