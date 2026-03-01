import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { AgencyReportsPageClient } from "@/components/agency/agency-reports-page-client"

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
  const effectiveOrgId =
    orgId && dashboardOrgs.some((o) => o.id === orgId) ? orgId : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  return (
    <div className="mx-auto max-w-7xl">
      <AgencyReportsPageClient orgId={effectiveOrgId} />
    </div>
  )
}
