import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { getAgencyAgents, getAgencyHierarchyTree } from "@/lib/db/agency"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { AgentsSubOrgFilter } from "@/components/agency/agents-sub-org-filter"
import { AgentsHierarchyView } from "@/components/agency/agents-hierarchy-view"

export default async function AgencyAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; sub_org?: string }>
}) {
  const { org: orgId, sub_org: filterSubOrgId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency/agents")

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId = orgId && dashboardOrgs.some((o) => o.id === orgId) ? orgId : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const agents = await getAgencyAgents(effectiveOrgId, filterSubOrgId || null)

  const serviceSupabase = createServiceRoleClient()
  const { data: childOrgs } = await serviceSupabase.rpc("get_downline_org_ids", { root_org_id: effectiveOrgId })
  const childIds = ((childOrgs ?? []) as string[]).filter((id) => id !== effectiveOrgId)
  const { data: subOrgs } = childIds.length > 0
    ? await serviceSupabase.from("organizations").select("id, name").in("id", childIds)
    : { data: [] }

  const currentOrg = dashboardOrgs.find((o) => o.id === effectiveOrgId)
  const rootOrgName = currentOrg?.name ?? "Organization"

  const hierarchyTree = await getAgencyHierarchyTree(effectiveOrgId)

  const orgParam = `org=${effectiveOrgId}`
  const baseUrl = `/agency/agents?${orgParam}`

  const hasContent = agents.length > 0 || hierarchyTree.length > 0

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hierarchy</h1>
          <p className="text-muted-foreground">Agencies and agents in your organization</p>
        </div>
        <AgentsSubOrgFilter
          subOrgs={subOrgs ?? []}
          baseUrl={baseUrl}
          currentSubOrg={filterSubOrgId}
        />
      </div>

      {hasContent ? (
        <AgentsHierarchyView
          hierarchyTree={hierarchyTree}
          rootOrgId={effectiveOrgId}
          agents={agents}
          orgParam={orgParam}
        />
      ) : (
        <div className="py-12 text-center text-muted-foreground">No agents yet</div>
      )}
    </div>
  )
}
