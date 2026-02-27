import { createServiceRoleClient } from "@/lib/supabase/server"
import { ACTIVE_COVERAGE_STATUSES } from "@/lib/coverage-options"

export interface AgencyDashboardMetrics {
  totalAgents: number
  totalClients: number
  totalActivePolicies: number
  newClientsThisMonth: number
  policiesWrittenThisMonth: number
}

export interface SubAgencyInfo {
  id: string
  name: string
  agentCount: number
}

export async function getAgencyDashboardMetrics(orgId: string): Promise<{
  metrics: AgencyDashboardMetrics
  subAgencies: SubAgencyInfo[]
}> {
  const supabase = createServiceRoleClient()

  const { data: agentIds } = await supabase.rpc("get_downline_agent_ids", { root_org_id: orgId })
  const ids = (agentIds ?? []) as string[]
  if (ids.length === 0) {
    const { data: childOrgs } = await supabase.rpc("get_downline_org_ids", { root_org_id: orgId })
    const childIds = (childOrgs ?? []) as string[]
    const subAgencies: SubAgencyInfo[] = []
    for (const cid of childIds) {
      if (cid === orgId) continue
      const { data: org } = await supabase.from("organizations").select("id, name").eq("id", cid).single()
      if (org) {
        const { data: ac } = await supabase.rpc("get_downline_agent_ids", { root_org_id: cid })
        subAgencies.push({ id: org.id, name: org.name, agentCount: (ac ?? []).length })
      }
    }
    return {
      metrics: {
        totalAgents: 0,
        totalClients: 0,
        totalActivePolicies: 0,
        newClientsThisMonth: 0,
        policiesWrittenThisMonth: 0,
      },
      subAgencies,
    }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: clients } = await supabase
    .from("clients")
    .select("id, agent_id, created_at")
    .in("agent_id", ids)

  const clientList = clients ?? []
  const clientIds = clientList.map((c) => c.id)

  let totalCoverages = 0
  let policiesThisMonth = 0
  if (clientIds.length > 0) {
    const { data: coverages } = await supabase
      .from("client_coverages")
      .select("id, client_id, status, effective_date, created_at")
      .in("client_id", clientIds)

    const covList = (coverages ?? []) as { status?: string; effective_date?: string; created_at?: string }[]
    totalCoverages = covList.filter((c) =>
      (ACTIVE_COVERAGE_STATUSES as readonly string[]).includes(c.status ?? "")
    ).length
    policiesThisMonth = covList.filter((c) => {
      const d = c.effective_date ?? c.created_at
      return d && d >= monthStart
    }).length
  }

  const newClientsThisMonth = clientList.filter((c) => c.created_at >= monthStart).length

  const { data: childOrgs } = await supabase.rpc("get_downline_org_ids", { root_org_id: orgId })
  const childIds = ((childOrgs ?? []) as string[]).filter((id) => id !== orgId)
  const subAgencies: SubAgencyInfo[] = []
  for (const cid of childIds) {
    const { data: org } = await supabase.from("organizations").select("id, name").eq("id", cid).single()
    if (org) {
      const { data: ac } = await supabase.rpc("get_downline_agent_ids", { root_org_id: cid })
      subAgencies.push({ id: org.id, name: org.name, agentCount: (ac ?? []).length })
    }
  }

  return {
    metrics: {
      totalAgents: ids.length,
      totalClients: clientList.length,
      totalActivePolicies: totalCoverages,
      newClientsThisMonth,
      policiesWrittenThisMonth: policiesThisMonth,
    },
    subAgencies,
  }
}

export interface AgencyAgentRow {
  userId: string
  displayName: string
  email: string
  role: string
  organizationName: string
  organizationId: string
  clientCount: number
  policyCount: number
  acceptedAt: string | null
  status: string
  npn?: string
  phone?: string
}

export async function getAgencyAgents(
  orgId: string,
  filterSubOrgId?: string | null
): Promise<AgencyAgentRow[]> {
  const supabase = createServiceRoleClient()
  const { data: orgIds } = await supabase.rpc("get_downline_org_ids", { root_org_id: orgId })
  let targetOrgIds = (orgIds ?? []) as string[]
  if (filterSubOrgId) {
    targetOrgIds = targetOrgIds.filter((id) => id === filterSubOrgId)
  }

  // Include producing members and owners (owners may have is_producing=false but their production counts)
  const { data: producingMembers } = await supabase
    .from("organization_members")
    .select("user_id, role, organization_id, accepted_at, status")
    .in("organization_id", targetOrgIds)
    .eq("is_producing", true)
    .eq("status", "active")
  const { data: ownerRows } = await supabase
    .from("organizations")
    .select("id, owner_id")
    .in("id", targetOrgIds)
    .not("owner_id", "is", null)
  const ownerIds = [...new Set((ownerRows ?? []).map((o) => o.owner_id as string).filter(Boolean))]
  const { data: ownerMembers } =
    ownerIds.length > 0
      ? await supabase
          .from("organization_members")
          .select("user_id, role, organization_id, accepted_at, status")
          .in("user_id", ownerIds)
          .in("organization_id", targetOrgIds)
          .eq("status", "active")
      : { data: [] }
  const seen = new Set((producingMembers ?? []).map((m) => m.user_id))
  const members = [...(producingMembers ?? [])]
  for (const m of ownerMembers ?? []) {
    if (!seen.has(m.user_id)) {
      seen.add(m.user_id)
      members.push(m)
    }
  }

  if (!members?.length) return []

  const userIds = [...new Set(members.map((m) => m.user_id))]
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds)
  const authResults = await Promise.all(
    userIds.map((id) => supabase.auth.admin.getUserById(id))
  )
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]))
  const emailMap = new Map<string, string>()
  for (let i = 0; i < userIds.length; i++) {
    const r = authResults[i]
    const u = r?.data?.user
    if (u) emailMap.set(u.id, u.email ?? "")
  }
  const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", targetOrgIds)
  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]))

  const clientCounts: Record<string, number> = {}
  const policyCounts: Record<string, number> = {}
  const { data: clientCountRows } = await supabase
    .from("clients")
    .select("agent_id")
    .in("agent_id", userIds)
  for (const row of clientCountRows ?? []) {
    const aid = row.agent_id as string
    clientCounts[aid] = (clientCounts[aid] ?? 0) + 1
  }
  const clientIds = (await supabase.from("clients").select("id, agent_id").in("agent_id", userIds)).data ?? []
  const cids = clientIds.map((c) => c.id)
  if (cids.length > 0) {
    const { data: cov } = await supabase
      .from("client_coverages")
      .select("client_id")
      .in("client_id", cids)
    const clientToAgent = new Map(clientIds.map((c) => [c.id, c.agent_id as string]))
    for (const c of cov ?? []) {
      const aid = clientToAgent.get(c.client_id)
      if (aid) policyCounts[aid] = (policyCounts[aid] ?? 0) + 1
    }
  }

  const result: AgencyAgentRow[] = members.map((m) => ({
    userId: m.user_id,
    displayName: profileMap.get(m.user_id) ?? emailMap.get(m.user_id) ?? "Unknown",
    email: emailMap.get(m.user_id) ?? "",
    role: m.role,
    organizationName: orgMap.get(m.organization_id) ?? "",
    organizationId: m.organization_id,
    clientCount: clientCounts[m.user_id] ?? 0,
    policyCount: policyCounts[m.user_id] ?? 0,
    acceptedAt: m.accepted_at,
    status: m.status,
  }))

  result.sort((a, b) => a.displayName.localeCompare(b.displayName))
  return result
}

export async function getAgencyAgentsForRoster(
  orgId: string,
  filterSubOrgId?: string | null,
  statusFilter?: "active" | "inactive" | null
): Promise<AgencyAgentRow[]> {
  const supabase = createServiceRoleClient()
  const { data: orgIds } = await supabase.rpc("get_downline_org_ids", { root_org_id: orgId })
  let targetOrgIds = (orgIds ?? []) as string[]
  if (filterSubOrgId) {
    targetOrgIds = targetOrgIds.filter((id) => id === filterSubOrgId)
  }

  // Include producing members and owners (owners may have is_producing=false but their production counts)
  let query = supabase
    .from("organization_members")
    .select("user_id, role, organization_id, accepted_at, status")
    .in("organization_id", targetOrgIds)
    .eq("is_producing", true)
  if (statusFilter === "active") query = query.eq("status", "active")
  else if (statusFilter === "inactive") query = query.eq("status", "inactive")
  const { data: producingMembers } = await query
  const { data: ownerRows } = await supabase
    .from("organizations")
    .select("id, owner_id")
    .in("id", targetOrgIds)
    .not("owner_id", "is", null)
  const ownerIds = [...new Set((ownerRows ?? []).map((o) => o.owner_id as string).filter(Boolean))]
  let ownerMembers: { user_id: string; role: string; organization_id: string; accepted_at: string | null; status: string }[] = []
  if (ownerIds.length > 0) {
    const { data } = await supabase
      .from("organization_members")
      .select("user_id, role, organization_id, accepted_at, status")
      .in("user_id", ownerIds)
      .in("organization_id", targetOrgIds)
    ownerMembers = data ?? []
  }
  const matchesStatus = (s: string) =>
    !statusFilter || statusFilter === s
  const seen = new Set((producingMembers ?? []).map((m) => m.user_id))
  const members = [...(producingMembers ?? [])]
  for (const m of ownerMembers) {
    if (!seen.has(m.user_id) && matchesStatus(m.status)) {
      seen.add(m.user_id)
      members.push(m)
    }
  }

  if (!members.length) return []

  const userIds = [...new Set(members.map((m) => m.user_id))]
  const { data: profiles } = await supabase.from("profiles").select("id, display_name, npn, phone").in("id", userIds)
  const authResults = await Promise.all(
    userIds.map((id) => supabase.auth.admin.getUserById(id))
  )
  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      { displayName: p.display_name ?? "", npn: p.npn ?? "", phone: p.phone ?? "" },
    ])
  )
  const emailMap = new Map<string, string>()
  for (let i = 0; i < userIds.length; i++) {
    const r = authResults[i]
    const u = r?.data?.user
    if (u) emailMap.set(u.id, u.email ?? "")
  }
  const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", targetOrgIds)
  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]))

  const clientCounts: Record<string, number> = {}
  const policyCounts: Record<string, number> = {}
  const { data: clientCountRows } = await supabase.from("clients").select("agent_id").in("agent_id", userIds)
  for (const row of clientCountRows ?? []) {
    const aid = row.agent_id as string
    clientCounts[aid] = (clientCounts[aid] ?? 0) + 1
  }
  const clientIds = (await supabase.from("clients").select("id, agent_id").in("agent_id", userIds)).data ?? []
  const cids = clientIds.map((c) => c.id)
  if (cids.length > 0) {
    const { data: cov } = await supabase.from("client_coverages").select("client_id").in("client_id", cids)
    const clientToAgent = new Map(clientIds.map((c) => [c.id, c.agent_id as string]))
    for (const c of cov ?? []) {
      const aid = clientToAgent.get(c.client_id)
      if (aid) policyCounts[aid] = (policyCounts[aid] ?? 0) + 1
    }
  }

  const result: AgencyAgentRow[] = members.map((m) => {
    const p = profileMap.get(m.user_id)
    const email = emailMap.get(m.user_id) ?? ""
    return {
      userId: m.user_id,
      displayName: p?.displayName ?? (email || "Unknown"),
      email,
      role: m.role,
      organizationName: orgMap.get(m.organization_id) ?? "",
      organizationId: m.organization_id,
      clientCount: clientCounts[m.user_id] ?? 0,
      policyCount: policyCounts[m.user_id] ?? 0,
      acceptedAt: m.accepted_at,
      status: m.status,
      npn: p?.npn ?? "",
      phone: p?.phone ?? "",
    }
  })
  result.sort((a, b) => a.displayName.localeCompare(b.displayName))
  return result
}

export interface AgencyMemberRow {
  userId: string
  displayName: string
  email: string
  role: string
  hasDashboardAccess: boolean
  status: string
  acceptedAt: string | null
}

export async function getAgencyMembers(orgId: string): Promise<AgencyMemberRow[]> {
  const supabase = createServiceRoleClient()

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, role, has_dashboard_access, status, accepted_at")
    .eq("organization_id", orgId)

  if (!members?.length) return []

  const userIds = [...new Set(members.map((m) => m.user_id))]
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds)
  const authResults = await Promise.all(userIds.map((id) => supabase.auth.admin.getUserById(id)))
  const emailMap = new Map(
    authResults
      .filter((r) => r.data?.user)
      .map((r) => [r.data!.user!.id, r.data!.user!.email ?? ""])
  )
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]))

  return (members ?? []).map((m) => ({
    userId: m.user_id,
    displayName: profileMap.get(m.user_id) ?? emailMap.get(m.user_id) ?? "Unknown",
    email: emailMap.get(m.user_id) ?? "",
    role: m.role,
    hasDashboardAccess: m.has_dashboard_access,
    status: m.status,
    acceptedAt: m.accepted_at,
  }))
}

export async function isAgentInDownline(orgId: string, agentId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.rpc("get_downline_agent_ids", { root_org_id: orgId })
  const ids = (data ?? []) as string[]
  return ids.includes(agentId)
}

export async function getAgentBookData(agentId: string) {
  const supabase = createServiceRoleClient()
  const [clientsRes, activitiesRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, status, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select("id, type, description, created_at, related_type, related_id")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const clients = clientsRes.data ?? []
  const clientIds = clients.map((c) => c.id)
  const { data: coverages } = clientIds.length > 0
    ? await supabase
        .from("client_coverages")
        .select("id, client_id, plan_type, carrier, plan_name, effective_date, status")
        .in("client_id", clientIds)
    : { data: [] }
  const clientMap = new Map(clients.map((c) => [c.id, c]))
  const coveragesWithClient = (coverages ?? []).map((c) => ({
    ...c,
    clientName: [clientMap.get(c.client_id)?.first_name, clientMap.get(c.client_id)?.last_name]
      .filter(Boolean)
      .join(" "),
  }))

  return {
    clients,
    coverages: coveragesWithClient,
    activities: activitiesRes.data ?? [],
  }
}
