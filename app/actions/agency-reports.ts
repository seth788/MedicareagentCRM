"use server"

import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { getReportRows } from "@/lib/db/reports"
import { getAgencyAgentsForRoster } from "@/lib/db/agency"
import { applyFilters, type ReportFilter } from "@/lib/report-filters"
import type { Client } from "@/lib/types"
import type { PolicySalesRow } from "@/lib/agency-report-columns"

const COUNTY_JURISDICTION_SUFFIX_REGEX =
  /\s+(county|parish|borough|census area|municipality|city and borough)$/i

function formatCountyForDisplay(value?: string | null): string | undefined {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return undefined
  if (COUNTY_JURISDICTION_SUFFIX_REGEX.test(trimmed)) return trimmed
  return `${trimmed} County`
}

export async function fetchAgencyReportData(orgId: string): Promise<{
  clients: Client[]
  agencyByClientId: Record<string, string>
  error?: string
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  if (!dashboardOrgs.some((o) => o.id === orgId)) {
    return { clients: [], agencyByClientId: {}, error: "Access denied" }
  }

  const svc = createServiceRoleClient()

  const { data: agentIds } = await svc.rpc("get_downline_agent_ids", { root_org_id: orgId })
  const ids = (agentIds ?? []) as string[]
  if (ids.length === 0) {
    return { clients: [], agencyByClientId: {} }
  }

  const { data: rows, error } = await svc
    .from("clients")
    .select("id, agent_id, first_name, last_name, title, middle_name, suffix, nickname, gender, fun_facts, dob, turning65_date, preferred_contact_method, language, spouse_id, medicare_number, part_a_effective_date, part_b_effective_date, allergies, conditions, health_tracker, source, status, image_url, created_at, updated_at")
    .in("agent_id", ids)
    .order("created_at", { ascending: false })
  if (error) return { clients: [], agencyByClientId: {}, error: error.message }
  if (!rows?.length) return { clients: [], agencyByClientId: {} }

  const { data: members } = await svc
    .from("organization_members")
    .select("user_id, organization_id")
    .in("user_id", ids)
    .eq("status", "active")
  const agentToOrgId = new Map((members ?? []).map((m) => [m.user_id, m.organization_id]))
  const orgIds = [...new Set(agentToOrgId.values())]
  const { data: orgs } = await svc.from("organizations").select("id, name").in("id", orgIds)
  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]))

  const agencyByClientId: Record<string, string> = {}
  for (const r of rows) {
    const agentId = r.agent_id as string
    const orgIdForAgent = agentToOrgId.get(agentId)
    const agencyName = orgIdForAgent ? orgMap.get(orgIdForAgent) ?? "Unknown" : "Unknown"
    agencyByClientId[r.id] = agencyName
  }

  const clientIds = rows.map((r) => r.id)
  const [phonesRes, emailsRes, addressesRes, doctorsRes, medsRes, pharmaciesRes, notesRes, coverageRes] =
    await Promise.all([
      svc.from("client_phones").select("id, client_id, number, type, is_preferred, note").in("client_id", clientIds),
      svc.from("client_emails").select("id, client_id, value, is_preferred, note").in("client_id", clientIds),
      svc.from("client_addresses").select("id, client_id, type, address, unit, city, county, state, zip, is_preferred").in("client_id", clientIds),
      svc.from("client_doctors").select("client_id, name, specialty, phone, first_name, last_name, provider_id, facility_address, importance, note").in("client_id", clientIds),
      svc.from("client_medications").select("client_id, name, dosage, frequency, quantity, notes, first_prescribed, rxcui, drug_name, dosage_display, dose_form, is_package_drug, package_description, package_ndc, brand_name").in("client_id", clientIds),
      svc.from("client_pharmacies").select("client_id, name, phone, address").in("client_id", clientIds),
      svc.from("client_notes").select("client_id, text, created_at, updated_at, created_by").in("client_id", clientIds),
      svc.from("client_coverages").select("id, client_id, plan_type, company_id, carrier, plan_id, plan_name, status, application_date, effective_date, written_as, election_period, member_policy_number, replacing_coverage_id, application_id, hra_collected, commission_status, notes, premium, bonus, billing_method, draft_day, enrollment_method, new_to_book_or_rewrite, created_at, updated_at").in("client_id", clientIds),
    ])

  const byClient = (arr: { client_id: string }[]) => {
    const m: Record<string, typeof arr> = {}
    for (const x of arr) {
      if (!m[x.client_id]) m[x.client_id] = []
      m[x.client_id].push(x)
    }
    return m
  }
  const phonesBy = byClient(phonesRes.data ?? [])
  const emailsBy = byClient(emailsRes.data ?? [])
  const addressesBy = byClient(addressesRes.data ?? [])
  const doctorsBy = byClient(doctorsRes.data ?? [])
  const medsBy = byClient(medsRes.data ?? [])
  const pharmaciesBy = byClient(pharmaciesRes.data ?? [])
  const notesBy = byClient(notesRes.data ?? [])
  const coveragesBy = byClient(coverageRes.data ?? [])

  const noteAuthorIds = [...new Set((notesRes.data ?? []).map((n) => (n as { created_by?: string }).created_by).filter(Boolean))] as string[]
  const { data: noteProfiles } = noteAuthorIds.length > 0
    ? await svc.from("profiles").select("id, display_name").in("id", noteAuthorIds)
    : { data: [] }
  const noteAuthorMap = new Map((noteProfiles ?? []).map((p) => [p.id, p.display_name ?? "Unknown"]))

  type CoverageRow = { client_id: string; id: string; plan_type: string; company_id?: string; carrier: string; plan_id?: string; plan_name: string; status: string; application_date?: string; effective_date?: string; written_as?: string; election_period?: string; member_policy_number?: string; replacing_coverage_id?: string; application_id?: string; hra_collected?: boolean; commission_status?: string; notes?: string; premium?: number; bonus?: number; billing_method?: string; draft_day?: string; enrollment_method?: string; new_to_book_or_rewrite?: string; created_at?: string; updated_at?: string }
  function mapCoverageRow(r: CoverageRow): Client["coverages"][number] {
    return {
      id: r.id,
      planType: r.plan_type as "MAPD" | "PDP" | "Med Supp",
      companyId: r.company_id ?? undefined,
      carrier: r.carrier ?? "",
      planId: r.plan_id ?? undefined,
      planName: r.plan_name ?? "",
      status: r.status ?? "",
      applicationDate: r.application_date ?? "",
      effectiveDate: r.effective_date ?? "",
      writtenAs: r.written_as ?? "",
      electionPeriod: r.election_period ?? "",
      memberPolicyNumber: r.member_policy_number ?? "",
      replacingCoverageId: r.replacing_coverage_id ?? undefined,
      applicationId: r.application_id ?? "",
      hraCollected: r.hra_collected ?? false,
      commissionStatus: r.commission_status ?? undefined,
      notes: r.notes ?? undefined,
      premium: r.premium != null ? Number(r.premium) : undefined,
      bonus: r.bonus != null ? Number(r.bonus) : undefined,
      billingMethod: r.billing_method ?? undefined,
      draftDay: r.draft_day ?? undefined,
      enrollmentMethod: r.enrollment_method ?? undefined,
      newToBookOrRewrite: r.new_to_book_or_rewrite ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  }

  const clients: Client[] = rows.map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    title: c.title ?? undefined,
    middleName: c.middle_name ?? undefined,
    suffix: c.suffix ?? undefined,
    nickname: c.nickname ?? undefined,
    gender: c.gender ?? undefined,
    funFacts: c.fun_facts ?? undefined,
    phones: (phonesBy[c.id] ?? []).map((p: { id: string; number: string; type: string; is_preferred: boolean; note?: string }) => ({
      id: p.id,
      number: p.number,
      type: p.type,
      isPreferred: p.is_preferred,
      note: p.note ?? undefined,
    })),
    emails: (emailsBy[c.id] ?? []).map((e: { id: string; value: string; is_preferred: boolean; note?: string }) => ({
      id: e.id,
      value: e.value,
      isPreferred: e.is_preferred,
      note: e.note ?? undefined,
    })),
    addresses: (addressesBy[c.id] ?? []).map((a: { id: string; type: string; address: string; unit?: string; city: string; county?: string; state: string; zip: string; is_preferred: boolean }) => ({
      id: a.id,
      type: a.type,
      address: a.address,
      unit: a.unit ?? undefined,
      city: a.city,
      county: formatCountyForDisplay(a.county),
      state: a.state,
      zip: a.zip,
      isPreferred: a.is_preferred,
    })),
    dob: c.dob,
    turning65Date: c.turning65_date,
    preferredContactMethod: c.preferred_contact_method,
    language: c.language,
    spouseId: c.spouse_id ?? undefined,
    medicareNumber: "",
    hasMedicareNumber: !!(c.medicare_number != null && String(c.medicare_number).trim() !== ""),
    partAEffectiveDate: c.part_a_effective_date ?? "",
    partBEffectiveDate: c.part_b_effective_date ?? "",
    doctors: (doctorsBy[c.id] ?? []).map((d: { name: string; specialty: string; phone: string; first_name?: string; last_name?: string; provider_id?: string; facility_address?: string; importance?: string; note?: string }) => ({
      name: d.name,
      specialty: d.specialty,
      phone: d.phone ?? "",
      firstName: d.first_name ?? undefined,
      lastName: d.last_name ?? undefined,
      providerId: d.provider_id ?? undefined,
      facilityAddress: d.facility_address ?? undefined,
      importance: d.importance as "essential" | "preferred" | "flexible" | undefined,
      note: d.note ?? undefined,
    })),
    medications: (medsBy[c.id] ?? []).map((m: { name: string; dosage?: string; frequency: string; quantity?: number; notes?: string; first_prescribed?: string; rxcui?: string; drug_name?: string; dosage_display?: string; dose_form?: string; is_package_drug?: boolean; package_description?: string; package_ndc?: string; brand_name?: string }) => ({
      name: m.name,
      dosage: m.dosage ?? undefined,
      frequency: m.frequency,
      quantity: m.quantity ?? undefined,
      notes: m.notes ?? undefined,
      firstPrescribed: m.first_prescribed ?? undefined,
      rxcui: m.rxcui ?? undefined,
      drugName: m.drug_name ?? undefined,
      dosageDisplay: m.dosage_display ?? undefined,
      doseForm: m.dose_form ?? undefined,
      isPackageDrug: m.is_package_drug ?? undefined,
      packageDescription: m.package_description ?? undefined,
      packageNdc: m.package_ndc ?? undefined,
      brandName: m.brand_name ?? undefined,
    })),
    pharmacies: (pharmaciesBy[c.id] ?? []).map((p: { name: string; phone: string; address: string }) => ({
      name: p.name,
      phone: p.phone ?? "",
      address: p.address ?? "",
    })),
    allergies: c.allergies ?? [],
    conditions: c.conditions ?? [],
    healthTracker: c.health_tracker ?? undefined,
    source: c.source ?? undefined,
    status: (c as { status?: string }).status ?? undefined,
    notes: (notesBy[c.id] ?? []).map((n: { text: string; created_at: string; updated_at?: string; created_by?: string }) => ({
      text: n.text,
      createdAt: n.created_at,
      updatedAt: n.updated_at ?? undefined,
      createdBy: n.created_by ?? undefined,
      createdByName: n.created_by ? noteAuthorMap.get(n.created_by) ?? undefined : undefined,
    })),
    coverages: (coveragesBy[c.id] ?? []).map(mapCoverageRow),
    imageUrl: c.image_url ?? undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    agentId: c.agent_id ?? undefined,
  }))

  return { clients, agencyByClientId }
}

/** Lightweight: returns filter dropdown options only. Pulls from ALL clients/coverages of downline agents. */
export async function getAgencyReportFilterOptions(orgId: string): Promise<{
  agencyOptions: string[]
  sourceOptions: string[]
  carrierOptions: string[]
  planNameOptions: string[]
  error?: string
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  if (!dashboardOrgs.some((o) => o.id === orgId)) {
    return { agencyOptions: [], sourceOptions: [], carrierOptions: [], planNameOptions: [], error: "Access denied" }
  }

  const svc = createServiceRoleClient()

  // Agency options: all orgs in the downline tree (root + sub-agencies)
  const { data: downlineOrgIds } = await svc.rpc("get_downline_org_ids", { root_org_id: orgId })
  const orgIds = (downlineOrgIds ?? []) as string[]
  const { data: orgs } =
    orgIds.length > 0
      ? await svc.from("organizations").select("id, name").in("id", orgIds)
      : { data: [] }
  const agencyOptions = [...new Set((orgs ?? []).map((o) => o.name).filter(Boolean))].sort((a, b) => a.localeCompare(b))

  // All downline agent IDs
  const { data: agentIds } = await svc.rpc("get_downline_agent_ids", { root_org_id: orgId })
  const ids = (agentIds ?? []) as string[]
  if (ids.length === 0) {
    return { agencyOptions, sourceOptions: [], carrierOptions: [], planNameOptions: [] }
  }

  // All clients from all downline agents (source options)
  const { data: clientsData } = await svc
    .from("clients")
    .select("id, source")
    .in("agent_id", ids)
    .limit(20000)
  const clientIds = (clientsData ?? []).map((c) => c.id)
  const sourceOptions = [...new Set((clientsData ?? []).map((c) => (c.source ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))

  // All coverages from those clients (carrier + plan name options)
  let coverages: { carrier?: string; plan_name?: string }[] = []
  if (clientIds.length > 0) {
    const BATCH_SIZE = 1500
    for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
      const batch = clientIds.slice(i, i + BATCH_SIZE)
      const { data: batchData } = await svc
        .from("client_coverages")
        .select("carrier, plan_name")
        .in("client_id", batch)
        .limit(10000)
      coverages = coverages.concat(batchData ?? [])
    }
  }
  const carrierOptions = [...new Set(coverages.map((c) => (c.carrier ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  let planNameOptions = [...new Set(coverages.map((c) => (c.plan_name ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))

  // Fallback: if no plan names from coverages, fetch from medicare_plans (e.g. new org or sparse data)
  if (planNameOptions.length === 0) {
    try {
      const { data: planRows } = await svc
        .from("medicare_plans")
        .select("plan_name")
        .not("plan_name", "is", null)
        .limit(2000)
      const names = (planRows ?? []).map((r) => (r as { plan_name?: string }).plan_name?.trim()).filter(Boolean) as string[]
      planNameOptions = [...new Set(names)].sort((a, b) => a.localeCompare(b))
    } catch {
      // medicare_plans may not exist or be accessible; leave planNameOptions empty
    }
  }

  return { agencyOptions, sourceOptions, carrierOptions, planNameOptions }
}

/** Statuses that exclude a policy from sales (terminated, replaced, etc.) */
const EXCLUDED_COVERAGE_STATUSES = [
  "Replaced",
  "Canceled",
  "Disenrolled",
  "Declined",
  "Withdrawn",
  "Terminated",
]

function getPolicySalesRows(
  clients: Client[],
  filters: ReportFilter[],
  agencyByClientId: Record<string, string>,
  agentProfileMap: Map<string, { firstName: string; lastName: string }>
): PolicySalesRow[] {
  const filtered = applyFilters(clients, filters, agencyByClientId)
  const effDateFilter = filters.find((f) => f.field === "coverage_effective_date")
  const filterWithPolicyDate = filters.find((f) => f.policyDateFrom || f.policyDateTo)
  const from =
    (effDateFilter?.value ? new Date(effDateFilter.value) : null) ??
    (filterWithPolicyDate?.policyDateFrom ? new Date(filterWithPolicyDate.policyDateFrom) : null)
  const to =
    (effDateFilter?.valueTo ? new Date(effDateFilter.valueTo) : null) ??
    (filterWithPolicyDate?.policyDateTo ? new Date(filterWithPolicyDate.policyDateTo) : null)

  const rows: PolicySalesRow[] = []
  for (const client of filtered) {
    const coverages = client.coverages ?? []
    const statusLabel =
      client.status === "lead"
        ? "Lead"
        : client.status === "inactive"
          ? "Inactive"
          : "Active Client"
    const memberFirst = client.firstName ?? ""
    const memberLast = client.lastName ?? ""
    const source = client.source ?? ""

    const doctors = client.doctors ?? []
    const sortedDoctors = [...doctors].sort((a, b) => {
      const order = { essential: 0, preferred: 1, flexible: 2 }
      const aOrd = order[a.importance ?? "flexible"] ?? 3
      const bOrd = order[b.importance ?? "flexible"] ?? 3
      return aOrd - bOrd
    })
    const firstDoctor = sortedDoctors[0]
    const providerFirst = firstDoctor?.firstName ?? firstDoctor?.name?.split(" ")[0] ?? ""
    const providerLast = firstDoctor?.lastName ?? (firstDoctor?.name ? firstDoctor.name.split(" ").slice(1).join(" ") : "") ?? ""

    const agentProfile = client.agentId ? agentProfileMap.get(client.agentId) : undefined
    const agentFirst = agentProfile?.firstName ?? ""
    const agentLast = agentProfile?.lastName ?? ""

    for (const cov of coverages) {
      const covStatus = (cov.status ?? "").trim()
      if (EXCLUDED_COVERAGE_STATUSES.includes(covStatus)) continue

      const effDate = cov.effectiveDate ? new Date(cov.effectiveDate) : null
      if (!effDate) continue
      if (from && effDate < from) continue
      if (to && effDate > to) continue

      rows.push({
        id: cov.id,
        clientId: client.id,
        agentFirst,
        agentLast,
        status: statusLabel,
        source,
        memberFirst,
        memberLast,
        providerFirst,
        providerLast,
        providerNetworks: "",
        policyType: cov.planType ?? "",
        policyStatus: covStatus,
        policyCompany: cov.carrier ?? "",
        policyPlanName: cov.planName ?? "",
        policyNumber: cov.memberPolicyNumber ?? "",
        policyEffectiveDate: cov.effectiveDate ?? "",
        policyApplicationDate: cov.applicationDate ?? "",
      })
    }
  }
  return rows
}

/** Run agency report with filters. Returns client rows or policy-level sales rows. */
export async function runAgencyReport(
  orgId: string,
  filters: ReportFilter[]
): Promise<
  | { rows: import("@/lib/db/reports").ReportRow[]; mode: "client"; error?: string }
  | { rows: PolicySalesRow[]; mode: "policy"; error?: string }
  | null
> {
  const data = await fetchAgencyReportData(orgId)
  if (!data || data.error) {
    return { rows: [], mode: "client", error: data?.error ?? "Unable to load report data" }
  }

  const hasEffectiveDateFilter =
    filters.some((f) => f.field === "coverage_effective_date") ||
    filters.some((f) => f.policyDateFrom || f.policyDateTo)
  if (hasEffectiveDateFilter) {
    const agentIds = [...new Set(data.clients.map((c) => c.agentId).filter(Boolean))] as string[]
    const svc = createServiceRoleClient()
    const { data: profiles } =
      agentIds.length > 0
        ? await svc.from("profiles").select("id, first_name, last_name, display_name").in("id", agentIds)
        : { data: [] }
    const agentProfileMap = new Map(
      (profiles ?? []).map((p) => {
        const firstName = (p.first_name ?? "").trim()
        const lastName = (p.last_name ?? "").trim()
        const displayName = (p.display_name ?? "").trim()
        const parts = displayName ? displayName.split(/\s+/) : []
        return [
          p.id,
          {
            firstName: firstName || (parts[0] ?? ""),
            lastName: lastName || (parts.slice(1).join(" ") ?? ""),
          },
        ]
      })
    )
    const policyRows = getPolicySalesRows(data.clients, filters, data.agencyByClientId, agentProfileMap)
    return { rows: policyRows, mode: "policy" }
  }

  const reportRows = getReportRows(data.clients, filters, data.agencyByClientId)
  const safeRows = reportRows.map((r) => {
    const { address, email, phone, addressSingle, emailSingle, phoneSingle, ...rest } = r
    return rest
  })
  return { rows: safeRows, mode: "client" }
}

/** Production report: monthly breakdown by effective date. Includes active + pending policies. */
export async function fetchProductionReport(
  orgId: string,
  params: { year: number; subOrg?: string | null }
): Promise<{ rows: Record<string, unknown>[]; error?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  if (!dashboardOrgs.some((o) => o.id === orgId)) {
    return { rows: [], error: "Access denied" }
  }

  const rootOrgForScope = params.subOrg ?? orgId
  const rosterRows = await getAgencyAgentsForRoster(rootOrgForScope, null, "active")
  const targetAgentIds = rosterRows.map((r) => r.userId)
  if (targetAgentIds.length === 0) {
    return { rows: [] }
  }

  const svc = createServiceRoleClient()
  const yearStart = `${params.year}-01-01`
  const yearEnd = `${params.year}-12-31`

  const clientIdsRes = await svc.from("clients").select("id").in("agent_id", targetAgentIds)
  const clientIds = (clientIdsRes.data ?? []).map((c) => c.id)
  if (clientIds.length === 0) {
    const rows = rosterRows.map((r) => ({
      agentId: r.userId,
      agentName: r.displayName,
      jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
      jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
      yearTotal: 0,
    }))
    return { rows }
  }

  const { data: coverages } = await svc
    .from("client_coverages")
    .select("client_id, effective_date, status")
    .in("client_id", clientIds)
    .gte("effective_date", yearStart)
    .lte("effective_date", yearEnd)

  const { data: clients } = await svc.from("clients").select("id, agent_id").in("id", clientIds)
  const clientToAgent = new Map((clients ?? []).map((c) => [c.id, c.agent_id]))

  type MonthCounts = { jan: number; feb: number; mar: number; apr: number; may: number; jun: number; jul: number; aug: number; sep: number; oct: number; nov: number; dec: number }
  const byAgent: Record<string, MonthCounts> = {}
  for (const r of rosterRows) {
    byAgent[r.userId] = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 }
  }

  for (const c of coverages ?? []) {
    const status = (c.status as string) ?? ""
    if (EXCLUDED_COVERAGE_STATUSES.includes(status)) continue
    const agentId = clientToAgent.get(c.client_id)
    if (!agentId || !byAgent[agentId]) continue
    const eff = c.effective_date as string
    if (!eff) continue
    const month = parseInt(eff.slice(5, 7), 10)
    if (month >= 1 && month <= 12) {
      const keys: (keyof MonthCounts)[] = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
      byAgent[agentId][keys[month - 1]]++
    }
  }

  const rows = rosterRows.map((r) => {
    const counts = byAgent[r.userId]
    const yearTotal = counts ? counts.jan + counts.feb + counts.mar + counts.apr + counts.may + counts.jun + counts.jul + counts.aug + counts.sep + counts.oct + counts.nov + counts.dec : 0
    return {
      agentId: r.userId,
      agentName: r.displayName,
      ...counts,
      yearTotal,
    }
  })
  rows.sort((a, b) => ((b.yearTotal as number) - (a.yearTotal as number)) || (a.agentName as string).localeCompare(b.agentName as string))
  return { rows }
}

/** Roster report: agents with counts */
export async function fetchRosterReport(
  orgId: string,
  params: { subOrg?: string | null; status?: "active" | "inactive" | null }
): Promise<{ rows: Record<string, unknown>[]; error?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  if (!dashboardOrgs.some((o) => o.id === orgId)) {
    return { rows: [], error: "Access denied" }
  }

  const rosterRows = await getAgencyAgentsForRoster(orgId, params.subOrg ?? null, params.status ?? null)
  const rows = rosterRows.map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    email: r.email,
    phone: r.phone ?? "",
    role: r.role,
    organizationName: r.organizationName,
    clientCount: r.clientCount,
    policyCount: r.policyCount,
    acceptedAt: r.acceptedAt ?? "",
    status: r.status,
    npn: r.npn ?? "",
  }))
  return { rows }
}

/** Clients report: agent client counts by status */
export async function fetchClientsReport(
  orgId: string,
  params: { start: string; end: string; subOrg?: string | null }
): Promise<{ rows: Record<string, unknown>[]; error?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  if (!dashboardOrgs.some((o) => o.id === orgId)) {
    return { rows: [], error: "Access denied" }
  }

  const svc = createServiceRoleClient()
  const { data: orgAgentIds } = await svc.rpc("get_downline_agent_ids", { root_org_id: orgId })
  let targetAgentIds = (orgAgentIds ?? []) as string[]
  if (params.subOrg) {
    const { data: subAgentIds } = await svc.rpc("get_downline_agent_ids", { root_org_id: params.subOrg })
    targetAgentIds = (subAgentIds ?? []) as string[]
  }

  const { data: clientList } = await svc
    .from("clients")
    .select("id, agent_id, status, created_at")
    .in("agent_id", targetAgentIds)

  const monthStart = params.start
  const monthEnd = params.end + "T23:59:59"
  const byAgent: Record<string, { total: number; new: number; active: number; lead: number; inactive: number }> = {}
  for (const c of clientList ?? []) {
    if (!byAgent[c.agent_id]) {
      byAgent[c.agent_id] = { total: 0, new: 0, active: 0, lead: 0, inactive: 0 }
    }
    byAgent[c.agent_id].total++
    const status = (c.status as string) ?? "active"
    if (status === "active") byAgent[c.agent_id].active++
    else if (status === "lead") byAgent[c.agent_id].lead++
    else byAgent[c.agent_id].inactive++
    if (c.created_at >= monthStart && c.created_at <= monthEnd) {
      byAgent[c.agent_id].new++
    }
  }

  const { data: profiles } = await svc.from("profiles").select("id, display_name").in("id", Object.keys(byAgent))
  const { data: members } = await svc.from("organization_members").select("user_id, organization_id").in("user_id", Object.keys(byAgent))
  const orgIds = [...new Set((members ?? []).map((m) => m.organization_id))]
  const { data: orgs } = await svc.from("organizations").select("id, name").in("id", orgIds)
  const memberToOrg = new Map((members ?? []).map((m) => [m.user_id, m.organization_id]))
  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]))

  const rows = Object.entries(byAgent).map(([agentId, counts]) => ({
    agentId,
    agentName: profileMap.get(agentId) ?? "Unknown",
    agencyName: orgMap.get(memberToOrg.get(agentId) ?? "") ?? "",
    ...counts,
  }))
  rows.sort((a, b) => (a.agentName as string).localeCompare(b.agentName as string))
  return { rows }
}

