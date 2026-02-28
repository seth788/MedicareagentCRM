import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { getAgencyMembers, getValidParentOrgsForSubAgency } from "@/lib/db/agency"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getOrgInviteLinksForTree } from "@/app/actions/organization-invites"
import { getPendingSubagencyRequests } from "@/app/actions/subagency-requests-admin"
import { MembersPageClient } from "@/components/agency/members-page-client"
import { SubagencyRequestsCard } from "@/components/agency/subagency-requests-card"

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

  const rootOrgId = await (async () => {
    const { getRootOrgId } = await import("@/lib/db/agency")
    return getRootOrgId(effectiveOrgId)
  })()
  const isRootOrg = effectiveOrgId === rootOrgId

  const [members, inviteResult, childOrgsResult, pendingRequests, parentOrgs] = await Promise.all([
    getAgencyMembers(effectiveOrgId),
    getOrgInviteLinksForTree(effectiveOrgId),
    serviceSupabase.rpc("get_downline_org_ids", { root_org_id: effectiveOrgId }),
    isRootOrg ? getPendingSubagencyRequests(rootOrgId) : [],
    isRootOrg ? getValidParentOrgsForSubAgency(rootOrgId) : [],
  ])

  const currentOrg = dashboardOrgs.find((o) => o.id === effectiveOrgId)
  const { invites = [] } = inviteResult
  const { data: childOrgs } = childOrgsResult
  const childIds = ((childOrgs ?? []) as string[]).filter((id) => id !== effectiveOrgId)
  const { data: subOrgs } =
    childIds.length > 0
      ? await serviceSupabase.from("organizations").select("id, name").in("id", childIds)
      : { data: [] }

  // Orgs the user can invite to: current org + its descendants
  const targetOrgsForInvite: { id: string; name: string }[] = [
    { id: effectiveOrgId, name: currentOrg?.name ?? "Current agency" },
    ...(subOrgs ?? []),
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-muted-foreground">
          Manage members of {currentOrg?.name ?? "your agency"}. Sub-agency owners appear here for billing and management.
        </p>
      </div>

      {isRootOrg && (pendingRequests?.length ?? 0) > 0 && (
        <SubagencyRequestsCard
          requests={pendingRequests ?? []}
          rootOrgId={rootOrgId}
          parentOrgs={parentOrgs ?? []}
        />
      )}

      <MembersPageClient
        organizationId={effectiveOrgId}
        members={members}
        invites={invites}
        isOwner={!!isOwner}
        currentUserId={user.id}
        subOrgs={subOrgs ?? []}
        targetOrgsForInvite={targetOrgsForInvite}
      />
    </div>
  )
}
