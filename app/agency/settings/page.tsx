import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AgencySettingsClient } from "@/components/agency/agency-settings-client"

export default async function AgencySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency/settings")

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId = orgId && dashboardOrgs.some((o) => o.id === orgId) ? orgId : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const serviceSupabase = createServiceRoleClient()
  const { data: org } = await serviceSupabase
    .from("organizations")
    .select("id, name, organization_type, created_at, parent_organization_id, owner_id")
    .eq("id", effectiveOrgId)
    .single()

  if (!org) redirect("/agency")

  let parentOrg: { id: string; name: string } | null = null
  if (org.parent_organization_id) {
    const { data: p } = await serviceSupabase
      .from("organizations")
      .select("id, name")
      .eq("id", org.parent_organization_id)
      .single()
    parentOrg = p
  }

  const { data: subOrgs } = await serviceSupabase
    .from("organizations")
    .select("id, name, owner_id")
    .eq("parent_organization_id", effectiveOrgId)

  const ownerIds = [...new Set([org.owner_id, ...(subOrgs?.map((s) => s.owner_id) ?? [])])]
  const { data: ownerProfiles } = await serviceSupabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ownerIds)
  const ownerMap = new Map((ownerProfiles ?? []).map((p) => [p.id, p.display_name ?? ""]))

  const currentOrg = dashboardOrgs.find((o) => o.id === effectiveOrgId)
  const isOwner = org.owner_id === user.id

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Agency Settings</h1>
        <p className="text-muted-foreground">{currentOrg?.name ?? "Agency"} configuration</p>
      </div>

      <AgencySettingsClient
        organizationId={effectiveOrgId}
        orgName={org.name}
        orgType={org.organization_type}
        createdAt={org.created_at}
        parentOrg={parentOrg}
        ownerName={ownerMap.get(org.owner_id) ?? "Unknown"}
        subAgencies={(subOrgs ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          ownerName: ownerMap.get(s.owner_id) ?? "Unknown",
        }))}
        isOwner={isOwner}
      />
    </div>
  )
}
