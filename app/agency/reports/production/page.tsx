import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { ProductionReportClient } from "@/components/agency/production-report-client"

export default async function ProductionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; year?: string; sub_org?: string }>
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

  const defaultYear = params.year ? parseInt(params.year, 10) : new Date().getFullYear()
  const validYear = Number.isNaN(defaultYear) ? new Date().getFullYear() : defaultYear

  const serviceSupabase = createServiceRoleClient()
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
        subOrgs={subOrgs ?? []}
        defaultYear={validYear}
        defaultSubOrg={params.sub_org || null}
      />
    </div>
  )
}
