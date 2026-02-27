import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuditLogClient } from "@/components/agency/audit-log-client"

const ACTION_LABELS: Record<string, string> = {
  member_invited: "Member Invited",
  member_accepted: "Member Accepted",
  member_removed: "Member Removed",
  member_reactivated: "Member Reactivated",
  member_role_changed: "Member Role Changed",
  dashboard_access_granted: "Dashboard Access Granted",
  dashboard_access_revoked: "Dashboard Access Revoked",
  sub_agency_created: "Sub-Agency Created",
  organization_created: "Organization Created",
  invite_created: "Invite Created",
  invite_revoked: "Invite Revoked",
  member_transferred: "Member Transferred",
  member_transferred_in: "Member Transferred In",
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; start?: string; end?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency/audit-log")

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  const effectiveOrgId =
    params.org && dashboardOrgs.some((o) => o.id === params.org) ? params.org : dashboardOrgs[0]?.id
  if (!effectiveOrgId) redirect("/dashboard")

  const page = Math.max(1, parseInt(params.page ?? "1", 10))
  const perPage = 25
  const offset = (page - 1) * perPage

  const now = new Date()
  const startDefault = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const endDefault = new Date().toISOString().slice(0, 10)
  const start = params.start || startDefault
  const end = params.end || endDefault
  const startTs = `${start}T00:00:00`
  const endTs = `${end}T23:59:59`

  const serviceSupabase = createServiceRoleClient()
  let query = serviceSupabase
    .from("organization_audit_log")
    .select("id, action, target_user_id, performed_by, details, created_at", { count: "exact" })
    .eq("organization_id", effectiveOrgId)
    .gte("created_at", startTs)
    .lte("created_at", endTs)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1)

  const { data: entries, count } = await query

  const userIds = new Set<string>()
  for (const e of entries ?? []) {
    if (e.performed_by) userIds.add(e.performed_by)
    if (e.target_user_id) userIds.add(e.target_user_id)
  }
  const { data: profiles } = await serviceSupabase
    .from("profiles")
    .select("id, display_name")
    .in("id", [...userIds])
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "Unknown"]))

  const rows = (entries ?? []).map((e) => ({
    id: e.id,
    action: ACTION_LABELS[e.action] ?? e.action,
    performedByName: profileMap.get(e.performed_by) ?? "Unknown",
    targetUserName: e.target_user_id ? profileMap.get(e.target_user_id) ?? "Unknown" : null,
    details: e.details as Record<string, unknown> | null,
    createdAt: e.created_at,
  }))

  const totalPages = Math.ceil((count ?? 0) / perPage)
  const currentOrg = dashboardOrgs.find((o) => o.id === effectiveOrgId)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-muted-foreground">
          Activity for {currentOrg?.name ?? "your agency"}
        </p>
      </div>

      <AuditLogClient
        organizationId={effectiveOrgId}
        rows={rows}
        defaultStart={start}
        defaultEnd={end}
        page={page}
        totalPages={totalPages}
      />
    </div>
  )
}
