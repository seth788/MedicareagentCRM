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
    .select("id, name, organization_type, created_at, parent_organization_id, owner_id, logo_url, show_logo_to_downline")
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

  const { data: ownerProfile } = await serviceSupabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", org.owner_id)
    .single()

  const currentOrg = dashboardOrgs.find((o) => o.id === effectiveOrgId)
  const isOwner = org.owner_id === user.id

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-1">
        <h2 className="text-base font-semibold text-foreground sm:text-xl">Agency Settings</h2>
        <p className="text-sm text-muted-foreground">{currentOrg?.name ?? "Agency"} configuration</p>
      </div>

      <AgencySettingsClient
        organizationId={effectiveOrgId}
        orgName={org.name}
        orgType={org.organization_type}
        createdAt={org.created_at}
        parentOrg={parentOrg}
        ownerName={(ownerProfile?.display_name as string) ?? "Unknown"}
        logoUrl={(org as { logo_url?: string | null }).logo_url ?? null}
        showLogoToDownline={(org as { show_logo_to_downline?: boolean }).show_logo_to_downline ?? true}
        isOwner={isOwner}
      />
    </div>
  )
}
