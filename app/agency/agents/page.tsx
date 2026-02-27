import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { getAgencyAgents } from "@/lib/db/agency"
import { Card, CardContent } from "@/components/ui/card"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { AgentsSubOrgFilter } from "@/components/agency/agents-sub-org-filter"

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

  const orgParam = `org=${effectiveOrgId}`
  const baseUrl = `/agency/agents?${orgParam}`

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agents</h1>
          <p className="text-muted-foreground">Producing agents in your organization</p>
        </div>
        <AgentsSubOrgFilter
          subOrgs={subOrgs ?? []}
          baseUrl={baseUrl}
          currentSubOrg={filterSubOrgId}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Agency</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Clients</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Policies</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.userId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/agency/agents/${a.userId}?${orgParam}`}
                        className="font-medium hover:underline"
                      >
                        {a.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.email}</td>
                    <td className="px-4 py-3 text-sm">{a.role.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-sm">{a.organizationName}</td>
                    <td className="px-4 py-3 text-right">{a.clientCount}</td>
                    <td className="px-4 py-3 text-right">{a.policyCount}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {a.acceptedAt ? new Date(a.acceptedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {agents.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">No agents yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
