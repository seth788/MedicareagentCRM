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
  // Include each (user, org) pair so agents appear under every org they belong to (e.g. owner of sub-agency shows under that sub-agency)
  const seen = new Set((producingMembers ?? []).map((m) => `${m.user_id}:${m.organization_id}`))
  const members = [...(producingMembers ?? [])]
  for (const m of ownerMembers ?? []) {
    const key = `${m.user_id}:${m.organization_id}`
    if (!seen.has(key)) {
      seen.add(key)
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
  /** When true, this member owns a sub-agency under this org (shown for billing/management) */
  isSubAgencyOwner?: boolean
  /** Name of their sub-agency, when isSubAgencyOwner is true */
  subAgencyName?: string
  /** Org this member belongs to (for root's full-tree view; used for remove/transfer) */
  organizationId?: string
  /** Org name (for root's full-tree view when member is in a nested agency) */
  organizationName?: string
}

export async function getAgencyMembers(orgId: string): Promise<AgencyMemberRow[]> {
  const supabase = createServiceRoleClient()
  const rootOrgId = await getRootOrgId(orgId)
  const isTopline = orgId === rootOrgId

  if (isTopline) {
    // Top-line: see ALL members in the full downline
    const { data: downlineIds } = await supabase.rpc("get_downline_org_ids", { root_org_id: orgId })
    const orgIds = (downlineIds ?? []) as string[]
    if (orgIds.length === 0) return []

    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id, role, has_dashboard_access, status, accepted_at, organization_id")
      .in("organization_id", orgIds)

    if (!members?.length) return []

    const { data: orgs } = await supabase.from("organizations").select("id, name, owner_id").in("id", orgIds)
    const orgMap = new Map((orgs ?? []).map((o) => [o.id, { name: o.name, ownerId: o.owner_id as string | null }]))
    const userIds = [...new Set(members.map((m) => m.user_id))]

    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds)
    const authResults = await Promise.all(userIds.map((id) => supabase.auth.admin.getUserById(id)))
    const emailMap = new Map(
      authResults
        .filter((r) => r.data?.user)
        .map((r) => [r.data!.user!.id, r.data!.user!.email ?? ""])
    )
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]))

    const result: AgencyMemberRow[] = members.map((m) => {
      const orgInfo = orgMap.get(m.organization_id)
      const isSubAgencyOwner = orgInfo?.ownerId === m.user_id && m.organization_id !== orgId
      return {
        userId: m.user_id,
        displayName: profileMap.get(m.user_id) ?? emailMap.get(m.user_id) ?? "Unknown",
        email: emailMap.get(m.user_id) ?? "",
        role: m.role,
        hasDashboardAccess: m.has_dashboard_access,
        status: m.status,
        acceptedAt: m.accepted_at,
        organizationId: m.organization_id,
        organizationName: orgInfo?.name,
        ...(isSubAgencyOwner ? { isSubAgencyOwner: true as const, subAgencyName: orgInfo?.name ?? "Sub-Agency" } : {}),
      }
    })

    result.sort((a, b) => a.displayName.localeCompare(b.displayName))
    return result
  }

  // Sub-agency: only direct members + owners of direct children
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, role, has_dashboard_access, status, accepted_at")
    .eq("organization_id", orgId)

  const { data: directChildOrgs } = await supabase
    .from("organizations")
    .select("id, name, owner_id")
    .eq("parent_organization_id", orgId)

  const subAgencyOwners =
    (directChildOrgs ?? [])
      .filter((s) => s.owner_id)
      .map((s) => ({
        user_id: s.owner_id as string,
        subAgencyName: s.name,
      }))

  const directMemberIds = new Set((members ?? []).map((m) => m.user_id))
  const subOwnerIds = subAgencyOwners
    .map((s) => s.user_id)
    .filter((id) => !directMemberIds.has(id))

  const allUserIds = [...new Set([...directMemberIds, ...subOwnerIds])]
  if (allUserIds.length === 0) return []

  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", allUserIds)
  const authResults = await Promise.all(allUserIds.map((id) => supabase.auth.admin.getUserById(id)))
  const emailMap = new Map(
    authResults
      .filter((r) => r.data?.user)
      .map((r) => [r.data!.user!.id, r.data!.user!.email ?? ""])
  )
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]))
  const subOwnerByUserId = new Map(subAgencyOwners.map((s) => [s.user_id, s.subAgencyName]))

  const result: AgencyMemberRow[] = [
    ...(members ?? []).map((m) => {
      const subAgency = subOwnerByUserId.get(m.user_id)
      return {
        userId: m.user_id,
        displayName: profileMap.get(m.user_id) ?? emailMap.get(m.user_id) ?? "Unknown",
        email: emailMap.get(m.user_id) ?? "",
        role: m.role,
        hasDashboardAccess: m.has_dashboard_access,
        status: m.status,
        acceptedAt: m.accepted_at,
        organizationId: orgId,
        ...(subAgency && { isSubAgencyOwner: true, subAgencyName: subAgency }),
      }
    }),
    ...subOwnerIds.map((userId) => {
      const subAgency = subOwnerByUserId.get(userId)
      return {
        userId,
        displayName: profileMap.get(userId) ?? emailMap.get(userId) ?? "Unknown",
        email: emailMap.get(userId) ?? "",
        role: "agency",
        hasDashboardAccess: true,
        status: "active",
        acceptedAt: null,
        isSubAgencyOwner: true,
        subAgencyName: subAgency ?? "Sub-Agency",
        organizationId: orgId,
      }
    }),
  ]

  result.sort((a, b) => a.displayName.localeCompare(b.displayName))
  return result
}


export async function getDirectChildOrgs(parentOrgId: string): Promise<{ id: string; name: string }[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("parent_organization_id", parentOrgId)
    .order("name")
  return (data ?? []) as { id: string; name: string }[]
}

/** Get the root (top-level) organization ID by walking up parent_organization_id */
export async function getRootOrgId(orgId: string): Promise<string> {
  const supabase = createServiceRoleClient()
  let currentId: string | null = orgId
  while (currentId) {
    const { data } = await supabase
      .from("organizations")
      .select("parent_organization_id")
      .eq("id", currentId)
      .single()
    const parentId = data?.parent_organization_id as string | null
    if (!parentId) return currentId
    currentId = parentId
  }
  return orgId
}

export interface OrgWithDepth {
  id: string
  name: string
  depth: number
}

/** Get root org + all descendant orgs (for parent picker when creating sub-agency) */
export async function getValidParentOrgsForSubAgency(rootOrgId: string): Promise<OrgWithDepth[]> {
  const supabase = createServiceRoleClient()
  const { data: downlineIds } = await supabase.rpc("get_downline_org_ids", { root_org_id: rootOrgId })
  const ids = (downlineIds ?? []) as string[]
  if (ids.length === 0) return []

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, parent_organization_id")
    .in("id", ids)

  const byId = new Map((orgs ?? []).map((o) => [o.id, { ...o, parent_organization_id: o.parent_organization_id as string | null }]))
  const result: OrgWithDepth[] = []

  function addWithDepth(id: string, depth: number) {
    const org = byId.get(id)
    if (!org) return
    result.push({ id: org.id, name: org.name, depth })
    const children = [...byId.values()].filter((c) => c.parent_organization_id === id)
    children.sort((a, b) => a.name.localeCompare(b.name))
    for (const child of children) addWithDepth(child.id, depth + 1)
  }
  addWithDepth(rootOrgId, 0)
  return result
}

export interface AgencyTreeNode {
  id: string
  name: string
  children: AgencyTreeNode[]
}

/** Get full hierarchy tree: root -> children -> grandchildren for display */
export async function getAgencyHierarchyTree(rootOrgId: string): Promise<AgencyTreeNode[]> {
  const supabase = createServiceRoleClient()
  const { data: downlineIds } = await supabase.rpc("get_downline_org_ids", { root_org_id: rootOrgId })
  const ids = (downlineIds ?? []) as string[]
  if (ids.length === 0) return []

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, parent_organization_id")
    .in("id", ids)

  const byId = new Map(
    (orgs ?? []).map((o) => [o.id, { id: o.id, name: o.name, parentId: o.parent_organization_id as string | null }])
  )

  function buildNode(id: string): AgencyTreeNode {
    const org = byId.get(id)
    const children = [...byId.values()]
      .filter((o) => o.parentId === id)
      .map((o) => buildNode(o.id))
    return {
      id,
      name: org?.name ?? "Unknown",
      children: children.sort((a, b) => a.name.localeCompare(b.name)),
    }
  }
  return [buildNode(rootOrgId)]
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
