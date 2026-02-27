import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { isAgentInDownline, getAgentBookData } from "@/lib/db/agency"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "@/components/icons"

export default async function AgentBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ org?: string }>
}) {
  const { userId: agentId } = await params
  const { org: orgId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency/agents/" + agentId)

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId = orgId && dashboardOrgs.some((o) => o.id === orgId) ? orgId : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const inDownline = await isAgentInDownline(effectiveOrgId, agentId)
  if (!inDownline) notFound()

  const serviceSupabase = createServiceRoleClient()
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("display_name")
    .eq("id", agentId)
    .single()
  const { data: authUser } = await serviceSupabase.auth.admin.getUserById(agentId)
  const { data: member } = await serviceSupabase
    .from("organization_members")
    .select("role, organization_id")
    .eq("user_id", agentId)
    .eq("status", "active")
    .limit(1)
    .single()
  const { data: agentOrg } = member
    ? await serviceSupabase.from("organizations").select("name").eq("id", member.organization_id).single()
    : { data: null }

  const { clients, coverages, activities } = await getAgentBookData(agentId)
  const orgParam = `?org=${effectiveOrgId}`

  const displayName =
    profile?.display_name ?? authUser?.user?.email ?? "Unknown"
  const email = authUser?.user?.email ?? ""

  return (
    <div className="p-6">
      <Link
        href={`/agency/agents${orgParam}`}
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agents
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{displayName}</h1>
        <p className="text-muted-foreground">
          {email}
          {agentOrg?.name && ` · ${agentOrg.name}`}
          {member?.role && ` · ${(member.role as string).replace(/_/g, " ")}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clients ({clients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left font-medium">Name</th>
                    <th className="px-2 py-2 text-left font-medium">Status</th>
                    <th className="px-2 py-2 text-left font-medium">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        {c.first_name} {c.last_name}
                      </td>
                      <td className="px-2 py-2">{c.status || "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No clients</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policies ({coverages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left font-medium">Client</th>
                    <th className="px-2 py-2 text-left font-medium">Plan</th>
                    <th className="px-2 py-2 text-left font-medium">Carrier</th>
                    <th className="px-2 py-2 text-left font-medium">Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {coverages.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{c.clientName || "—"}</td>
                      <td className="px-2 py-2">
                        {c.plan_name} ({c.plan_type})
                      </td>
                      <td className="px-2 py-2">{c.carrier || "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {c.effective_date ? new Date(c.effective_date).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {coverages.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No policies</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity ({activities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-auto">
            <ul className="space-y-2">
              {activities.map((a) => (
                <li key={a.id} className="flex justify-between text-sm">
                  <span>
                    <span className="font-medium">{(a.type as string).replace(/_/g, " ")}</span>:{" "}
                    {a.description}
                  </span>
                  <span className="text-muted-foreground">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
            {activities.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
