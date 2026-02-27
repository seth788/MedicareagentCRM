import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, FileText, CalendarClock } from "@/components/icons"

const reports = [
  {
    title: "Production Report",
    description: "Policies written by agent within a date range, grouped by plan type.",
    href: "production",
    icon: BarChart3,
  },
  {
    title: "Agent Roster",
    description: "All agents in the downline with client and policy counts.",
    href: "roster",
    icon: Users,
  },
  {
    title: "Client Summary",
    description: "Client counts by agent and status breakdown.",
    href: "clients",
    icon: FileText,
  },
  {
    title: "Renewal Report",
    description: "Policies coming up for renewal within a date range.",
    href: "renewals",
    icon: CalendarClock,
  },
]

export default async function AgencyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency/reports")

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId = orgId && dashboardOrgs.some((o) => o.id === orgId) ? orgId : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const orgParam = `?org=${effectiveOrgId}`

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">Run agency reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.href} href={`/agency/reports/${r.href}${orgParam}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <r.icon className="h-5 w-5" />
                  <CardTitle className="text-lg">{r.title}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">Run Report →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
