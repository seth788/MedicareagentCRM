import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { getAgencyMembers } from "@/lib/db/agency"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { MembersPageClient } from "@/components/agency/members-page-client"

export default async function AgencyMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency/members")

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId = orgId && dashboardOrgs.some((o) => o.id === orgId) ? orgId : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const serviceSupabase = createServiceRoleClient()
  const { data: org } = await serviceSupabase
    .from("organizations")
    .select("owner_id")
    .eq("id", effectiveOrgId)
    .single()
  const isOwner = org?.owner_id === user.id

  const members = await getAgencyMembers(effectiveOrgId)
  const currentOrg = dashboardOrgs.find((o) => o.id === effectiveOrgId)

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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-muted-foreground">
          Manage members of {currentOrg?.name ?? "your agency"}
        </p>
      </div>

      <MembersPageClient
        organizationId={effectiveOrgId}
        members={members}
        isOwner={!!isOwner}
        currentUserId={user.id}
        subOrgs={subOrgs ?? []}
      />
    </div>
  )
}
