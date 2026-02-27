import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserAgencyBookOrgs } from "@/lib/db/organizations"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SharedBookPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/shared-book")

  const agencyBookOrgs = await getUserAgencyBookOrgs(user.id)
  const effectiveOrgId =
    orgId && agencyBookOrgs.some((o) => o.id === orgId) ? orgId : agencyBookOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const serviceSupabase = createServiceRoleClient()
  const { data: agentIds } = await serviceSupabase.rpc("get_downline_agent_ids", {
    root_org_id: effectiveOrgId,
  })
  const ids = (agentIds ?? []) as string[]

  let clients: { id: string; first_name: string; last_name: string; agent_id: string; status: string }[] = []
  let coverages: { client_id: string; plan_name: string; plan_type: string; carrier: string; agent_id: string }[] = []
  const profileMap = new Map<string, string>()

  if (ids.length > 0) {
    const { data: clientRows } = await serviceSupabase
      .from("clients")
      .select("id, first_name, last_name, agent_id, status")
      .in("agent_id", ids)
    clients = clientRows ?? []

    const clientIds = clients.map((c) => c.id)
    if (clientIds.length > 0) {
      const { data: covRows } = await serviceSupabase
        .from("client_coverages")
        .select("client_id, plan_name, plan_type, carrier")
        .in("client_id", clientIds)
      const clientToAgent = new Map(clients.map((c) => [c.id, c.agent_id]))
      coverages = (covRows ?? []).map((c) => ({
        ...c,
        agent_id: clientToAgent.get(c.client_id) ?? "",
      }))
    }

    const { data: profiles } = await serviceSupabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids)
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.display_name ?? "Unknown")
    }
  }

  const currentOrg = agencyBookOrgs.find((o) => o.id === effectiveOrgId)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Shared Book</h1>
        <p className="text-muted-foreground">
          Clients and policies from {currentOrg?.name ?? "your agency"} (read-only)
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
                    <th className="px-2 py-2 text-left font-medium">Agent</th>
                    <th className="px-2 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        {c.first_name} {c.last_name}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {profileMap.get(c.agent_id) ?? "—"}
                      </td>
                      <td className="px-2 py-2">{c.status || "—"}</td>
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
                    <th className="px-2 py-2 text-left font-medium">Plan</th>
                    <th className="px-2 py-2 text-left font-medium">Carrier</th>
                    <th className="px-2 py-2 text-left font-medium">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {coverages.map((c, i) => (
                    <tr key={`${c.client_id}-${i}`} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        {c.plan_name} ({c.plan_type})
                      </td>
                      <td className="px-2 py-2">{c.carrier || "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {profileMap.get(c.agent_id) ?? "—"}
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
    </div>
  )
}
