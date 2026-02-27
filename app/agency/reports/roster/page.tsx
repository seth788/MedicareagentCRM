import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { getAgencyAgentsForRoster } from "@/lib/db/agency"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { RosterReportClient } from "@/components/agency/roster-report-client"

export default async function RosterReportPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; sub_org?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency/reports/roster")

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId =
    params.org && dashboardOrgs.some((o) => o.id === params.org) ? params.org : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const serviceSupabase = createServiceRoleClient()
  const { data: childOrgs } = await serviceSupabase.rpc("get_downline_org_ids", {
    root_org_id: effectiveOrgId,
  })
  const childIds = ((childOrgs ?? []) as string[]).filter((id) => id !== effectiveOrgId)
  const { data: subOrgs } =
    childIds.length > 0
      ? await serviceSupabase.from("organizations").select("id, name").in("id", childIds)
      : { data: [] }

  const rows = await getAgencyAgentsForRoster(
    effectiveOrgId,
    params.sub_org || null,
    (params.status as "active" | "inactive") || null
  )

  return (
    <div className="p-6">
      <RosterReportClient
        organizationId={effectiveOrgId}
        rows={rows}
        subOrgs={subOrgs ?? []}
        currentSubOrg={params.sub_org || null}
        currentStatus={params.status || null}
      />
    </div>
  )
}
