import type { Client } from "@/lib/types"
import {
  COVERAGE_STATUS_OPTIONS,
  COVERAGE_PLAN_TYPE_OPTIONS,
  WRITTEN_AS_OPTIONS,
  ELECTION_PERIOD_OPTIONS,
} from "@/lib/coverage-options"

export type ReportFilterField =
  | "client_status"
  | "client_source"
  | "client_gender"
  | "client_preferred_contact_method"
  | "client_dob"
  | "client_date_created"
  | "client_date_updated"
  | "client_health_tracker"
  | "client_language"
  | "address_city"
  | "address_state"
  | "address_zip"
  | "address_county"
  | "provider_last_name"
  | "provider_first_name"
  | "provider_facility"
  | "pharmacy_name"
  | "rx_name"
  | "coverage_plan_type"
  | "coverage_status"
  | "coverage_carrier"
  | "coverage_plan_name"
  | "coverage_contract_number"
  | "coverage_written_as"
  | "coverage_election_period"
  | "coverage_effective_date"
  | "coverage_application_date"

export interface ReportFilter {
  id: string
  field: ReportFilterField
  value: string
  /** For date_range filters: "to" date when using BETWEEN. */
  valueTo?: string
  label: string
}

export const CLIENT_STATUS_OPTIONS = [
  { value: "active", label: "Active Client" },
  { value: "lead", label: "Lead" },
  { value: "inactive", label: "Inactive" },
] as const

const GENDER_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
] as const

const PREFERRED_CONTACT_OPTIONS = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "text", label: "Text" },
] as const

export type FilterGroup = "individual" | "address" | "provider" | "pharmacy" | "rx" | "policy"

const DATE_RANGE_FIELDS: ReportFilterField[] = [
  "client_dob",
  "client_date_created",
  "client_date_updated",
  "coverage_effective_date",
  "coverage_application_date",
]

export function isDateRangeField(field: ReportFilterField): boolean {
  return DATE_RANGE_FIELDS.includes(field)
}

/** Delimiter for multiselect filter values (Record Separator - unlikely in names). */
export const MULTISELECT_DELIMITER = "\u001e"

export function parseMultiselectValue(value: string): string[] {
  if (!value?.trim()) return []
  return value.split(MULTISELECT_DELIMITER).map((s) => s.trim()).filter(Boolean)
}

export function formatMultiselectValue(values: string[]): string {
  return values.filter(Boolean).join(MULTISELECT_DELIMITER)
}

export const FILTER_FIELD_DEFINITIONS: {
  field: ReportFilterField
  label: string
  type: "text" | "date_range" | "multiselect"
  group?: FilterGroup
  options?: readonly { value: string; label: string }[]
  /** Shown when this filter is selected; suggests related filters or tips. */
  tip?: string
}[] = [
  // Individual
  { field: "client_status", label: "Individual: Status", type: "multiselect", group: "individual", options: CLIENT_STATUS_OPTIONS },
  { field: "client_source", label: "Individual: Source", type: "multiselect", group: "individual" },
  { field: "client_gender", label: "Individual: Gender", type: "multiselect", group: "individual", options: GENDER_OPTIONS },
  { field: "client_preferred_contact_method", label: "Individual: Preferred Contact Method", type: "multiselect", group: "individual", options: PREFERRED_CONTACT_OPTIONS },
  { field: "client_dob", label: "Individual: DOB", type: "date_range", group: "individual" },
  { field: "client_health_tracker", label: "Individual: Health Trackers", type: "multiselect", group: "individual" },
  { field: "client_language", label: "Individual: Preferred Language", type: "multiselect", group: "individual" },
  { field: "client_date_created", label: "Individual: Date Created", type: "date_range", group: "individual" },
  { field: "client_date_updated", label: "Individual: Date Updated", type: "date_range", group: "individual" },
  // Address
  { field: "address_city", label: "Individual: Address: City", type: "multiselect", group: "address" },
  { field: "address_state", label: "Individual: Address: State", type: "multiselect", group: "address" },
  { field: "address_zip", label: "Individual: Address: Zip", type: "multiselect", group: "address" },
  { field: "address_county", label: "Individual: Address: County", type: "multiselect", group: "address" },
  // Provider
  { field: "provider_last_name", label: "Individual: Provider: Last Name", type: "text", group: "provider" },
  { field: "provider_first_name", label: "Individual: Provider: First Name", type: "text", group: "provider" },
  { field: "provider_facility", label: "Individual: Provider: Facility Name", type: "text", group: "provider" },
  // Pharmacy
  { field: "pharmacy_name", label: "Individual: Pharmacy: Name", type: "multiselect", group: "pharmacy" },
  // Rx
  { field: "rx_name", label: "Individual: Rx: Name", type: "multiselect", group: "rx" },
  // Policy (Coverage)
  { field: "coverage_plan_type", label: "Individual: Policy: Type", type: "multiselect", group: "policy", options: COVERAGE_PLAN_TYPE_OPTIONS },
  { field: "coverage_status", label: "Individual: Policy: Status", type: "multiselect", group: "policy", options: COVERAGE_STATUS_OPTIONS.filter((o) => o.value !== "") },
  { field: "coverage_carrier", label: "Individual: Policy: Company", type: "multiselect", group: "policy" },
  { field: "coverage_plan_name", label: "Individual: Policy: Plan Name", type: "text", group: "policy" },
  { field: "coverage_contract_number", label: "Individual: Policy: Contract Number", type: "text", group: "policy" },
  { field: "coverage_written_as", label: "Individual: Policy: Written As", type: "multiselect", group: "policy", options: WRITTEN_AS_OPTIONS },
  { field: "coverage_election_period", label: "Individual: Policy: Election Period", type: "multiselect", group: "policy", options: ELECTION_PERIOD_OPTIONS },
  { field: "coverage_effective_date", label: "Individual: Policy: Effective Date", type: "date_range", group: "policy", tip: "Adding Individual: Policy: Status can help narrow results (e.g. active vs pending)." },
  { field: "coverage_application_date", label: "Individual: Policy: Application Date", type: "date_range", group: "policy", tip: "Adding Individual: Policy: Status can help narrow results (e.g. active vs pending)." },
]

function formatDateForDisplay(val: string): string {
  if (!val?.trim()) return ""
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return val
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function getFilterLabel(field: ReportFilterField, value: string, valueTo?: string): string {
  const def = FILTER_FIELD_DEFINITIONS.find((d) => d.field === field)
  if (!def) return `${field}: ${value}`
  if (def.type === "date_range") {
    const from = formatDateForDisplay(value)
    const to = formatDateForDisplay(valueTo ?? "")
    if (from && to) return `${def.label}: ${from} – ${to}`
    if (from) return `${def.label}: from ${from}`
    if (to) return `${def.label}: to ${to}`
    return def.label
  }
  if (def.type === "multiselect") {
    const vals = parseMultiselectValue(value)
    if (!vals.length) return def.label
    const labels = def.options
      ? vals.map((v) => def.options!.find((o) => o.value === v)?.label ?? v)
      : vals
    return `${def.label}: ${labels.join(", ")}`
  }
  return value ? `${def.label}: ${value}` : def.label
}

/** Returns display label for a single value (e.g. for multiselect chip). */
export function getValueLabel(field: ReportFilterField, value: string): string {
  const def = FILTER_FIELD_DEFINITIONS.find((d) => d.field === field)
  if (!def?.options) return value
  return def.options.find((o) => o.value === value)?.label ?? value
}

/** Returns tooltip text for a filter pill: "Individual: Status > Active Client" */
export function getFilterTooltip(filter: ReportFilter): string {
  const def = FILTER_FIELD_DEFINITIONS.find((d) => d.field === filter.field)
  if (!def) return filter.label
  if (def.type === "date_range") {
    const from = formatDateForDisplay(filter.value)
    const to = formatDateForDisplay(filter.valueTo ?? "")
    if (from && to) return `${def.label} > between ${from} and ${to}`
    if (from) return `${def.label} > on or after ${from}`
    if (to) return `${def.label} > on or before ${to}`
    return def.label
  }
  if (def.type === "multiselect") {
    const vals = parseMultiselectValue(filter.value)
    if (!vals.length) return def.label
    const labels = def.options
      ? vals.map((v) => def.options!.find((o) => o.value === v)?.label ?? v)
      : vals
    return `${def.label} > ${labels.join(", ")}`
  }
  return `${def.label} > ${filter.value}`
}

/** Quick report preset: id, label, and filters to apply. */
export interface QuickReportPreset {
  id: string
  label: string
  filters: Omit<ReportFilter, "id" | "label">[]
}

export const QUICK_REPORT_PRESETS: QuickReportPreset[] = [
  {
    id: "policies_by_type_mapd",
    label: "Policies by type (MAPD)",
    filters: [{ field: "coverage_plan_type", value: "MAPD" }],
  },
  {
    id: "policies_by_type_pdp",
    label: "Policies by type (PDP)",
    filters: [{ field: "coverage_plan_type", value: "PDP" }],
  },
  {
    id: "policies_by_type_med_supp",
    label: "Policies by type (Med Supp)",
    filters: [{ field: "coverage_plan_type", value: "Med Supp" }],
  },
  {
    id: "plans_by_company",
    label: "Plans by company",
    filters: [{ field: "coverage_carrier", value: "" }],
  },
]

/** Builds ReportFilter[] from a QuickReportPreset or saved report (same shape). */
export function presetToFilters(
  preset: { id: string; filters: Omit<ReportFilter, "id" | "label">[] }
): ReportFilter[] {
  return preset.filters.map((f, i) => ({
    id: `${preset.id}-${i}`,
    field: f.field,
    value: f.value,
    valueTo: f.valueTo,
    label: getFilterLabel(f.field, f.value, f.valueTo),
  }))
}

/** Serializes ReportFilter[] to stored format (field, value, valueTo). */
export function filtersToStoredFormat(
  filters: ReportFilter[]
): Omit<ReportFilter, "id" | "label">[] {
  return filters.map((f) => ({
    field: f.field,
    value: f.value,
    valueTo: f.valueTo,
  }))
}

function addressMatches(
  addresses: Client["addresses"] | undefined,
  field: "city" | "state" | "zip" | "county",
  selectedValues: string[]
): boolean {
  if (!selectedValues.length) return true
  const selectedSet = new Set(selectedValues.map((s) => s.toLowerCase().trim()).filter(Boolean))
  if (!selectedSet.size) return true
  const addrs = addresses ?? []
  if (!addrs.length) return false
  return addrs.some((a) => {
    const raw = (a[field] ?? "").toLowerCase().trim()
    return raw && selectedSet.has(raw)
  })
}

/** Extracts unique carrier/company names from all client coverages (sorted). */
export function getCarrierOptionsFromClients(clients: Client[]): string[] {
  const set = new Set<string>()
  for (const c of clients) {
    for (const cov of c.coverages ?? []) {
      const carrier = (cov.carrier ?? "").trim()
      if (carrier) set.add(carrier)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Extracts unique pharmacy names from all clients (sorted). */
export function getPharmacyOptionsFromClients(clients: Client[]): string[] {
  const set = new Set<string>()
  for (const c of clients) {
    for (const p of c.pharmacies ?? []) {
      const name = (p.name ?? "").trim()
      if (name) set.add(name)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Extracts unique medication/rx names from all clients (sorted). Uses name or drugName. */
export function getRxOptionsFromClients(clients: Client[]): string[] {
  const set = new Set<string>()
  for (const c of clients) {
    for (const m of c.medications ?? []) {
      const name = (m.name ?? m.drugName ?? "").trim()
      if (name) set.add(name)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Extracts unique source values from all clients (sorted). */
export function getSourceOptionsFromClients(clients: Client[]): string[] {
  const set = new Set<string>()
  for (const c of clients) {
    const s = (c.source ?? "").trim()
    if (s) set.add(s)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Extracts unique health tracker values from all clients (sorted). */
export function getHealthTrackerOptionsFromClients(clients: Client[]): string[] {
  const set = new Set<string>()
  for (const c of clients) {
    for (const t of c.healthTracker ?? []) {
      const v = (t ?? "").trim()
      if (v) set.add(v)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Extracts unique preferred language values from all clients (sorted). */
export function getLanguageOptionsFromClients(clients: Client[]): string[] {
  const set = new Set<string>()
  for (const c of clients) {
    const lang = (c.language ?? "").trim()
    if (lang) set.add(lang)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Extracts unique city values from all client addresses (sorted). */
export function getCityOptionsFromClients(clients: Client[]): string[] {
  const set = new Set<string>()
  for (const c of clients) {
    for (const a of c.addresses ?? []) {
      const city = (a.city ?? "").trim()
      if (city) set.add(city)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Extracts unique state values from all client addresses (sorted). */
export function getStateOptionsFromClients(clients: Client[]): string[] {
  const set = new Set<string>()
  for (const c of clients) {
    for (const a of c.addresses ?? []) {
      const state = (a.state ?? "").trim()
      if (state) set.add(state)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Extracts unique zip values from all client addresses (sorted). */
export function getZipOptionsFromClients(clients: Client[]): string[] {
  const set = new Set<string>()
  for (const c of clients) {
    for (const a of c.addresses ?? []) {
      const zip = (a.zip ?? "").trim()
      if (zip) set.add(zip)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Extracts unique county values from all client addresses (sorted). */
export function getCountyOptionsFromClients(clients: Client[]): string[] {
  const set = new Set<string>()
  for (const c of clients) {
    for (const a of c.addresses ?? []) {
      const county = (a.county ?? "").trim()
      if (county) set.add(county)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Applies filters to clients; returns filtered list. All conditions are ANDed. */
export function applyFilters(clients: Client[], filters: ReportFilter[]): Client[] {
  if (!filters.length) return clients

  return clients.filter((client) => {
    for (const f of filters) {
      switch (f.field) {
        case "client_status": {
          const selected = parseMultiselectValue(f.value ?? "")
          if (!selected.length) break
          const status = client.status ?? "active"
          if (!selected.includes(status)) return false
          break
        }
        case "client_source": {
          const selected = parseMultiselectValue(f.value ?? "")
          if (!selected.length) break
          const source = (client.source ?? "").trim()
          const selectedSet = new Set(selected.map((s) => s.trim().toLowerCase()).filter(Boolean))
          if (!source || !selectedSet.has(source.toLowerCase())) return false
          break
        }
        case "client_gender": {
          const selected = parseMultiselectValue(f.value ?? "")
          if (!selected.length) break
          const gender = client.gender ?? ""
          if (!selected.includes(gender)) return false
          break
        }
        case "client_preferred_contact_method": {
          const selected = parseMultiselectValue(f.value ?? "")
          if (!selected.length) break
          const method = client.preferredContactMethod ?? ""
          if (!selected.includes(method)) return false
          break
        }
        case "client_dob": {
          const from = f.value ? new Date(f.value) : null
          const to = f.valueTo ? new Date(f.valueTo) : null
          if (!from && !to) break
          const dob = client.dob ? new Date(client.dob) : null
          if (!dob) return false
          if (from && dob < from) return false
          if (to && dob > to) return false
          break
        }
        case "client_health_tracker": {
          const selected = parseMultiselectValue(f.value ?? "")
          if (!selected.length) break
          const trackers = client.healthTracker ?? []
          const selectedSet = new Set(selected.map((s) => s.trim().toLowerCase()).filter(Boolean))
          if (!selectedSet.size) break
          const match = trackers.some((t) =>
            selectedSet.has((t ?? "").trim().toLowerCase())
          )
          if (!match) return false
          break
        }
        case "client_language": {
          const selected = parseMultiselectValue(f.value ?? "")
          if (!selected.length) break
          const lang = (client.language ?? "").trim()
          const selectedSet = new Set(selected.map((s) => s.trim().toLowerCase()).filter(Boolean))
          if (!lang || !selectedSet.has(lang.toLowerCase())) return false
          break
        }
        case "client_date_created": {
          const from = f.value ? new Date(f.value) : null
          const to = f.valueTo ? new Date(f.valueTo) : null
          if (!from && !to) break
          const created = client.createdAt ? new Date(client.createdAt) : null
          if (!created) return false
          if (from && created < from) return false
          if (to && created > to) return false
          break
        }
        case "client_date_updated": {
          const from = f.value ? new Date(f.value) : null
          const to = f.valueTo ? new Date(f.valueTo) : null
          if (!from && !to) break
          const updated = client.updatedAt ? new Date(client.updatedAt) : null
          if (!updated) return false
          if (from && updated < from) return false
          if (to && updated > to) return false
          break
        }
        case "address_city":
        case "address_state":
        case "address_zip":
        case "address_county": {
          const key = f.field.replace("address_", "") as "city" | "state" | "zip" | "county"
          const selected = parseMultiselectValue(f.value ?? "")
          if (!addressMatches(client.addresses, key, selected)) return false
          break
        }
        case "provider_last_name": {
          const v = (f.value ?? "").toLowerCase().trim()
          if (!v) break
          const doctors = client.doctors ?? []
          if (!doctors.length) return false
          const match = doctors.some((d) => {
            const ln = (d.lastName ?? d.name ?? "").toLowerCase()
            return ln.includes(v)
          })
          if (!match) return false
          break
        }
        case "provider_first_name": {
          const v = (f.value ?? "").toLowerCase().trim()
          if (!v) break
          const doctors = client.doctors ?? []
          if (!doctors.length) return false
          const match = doctors.some((d) => {
            const fn = (d.firstName ?? d.name ?? "").toLowerCase()
            return fn.includes(v)
          })
          if (!match) return false
          break
        }
        case "provider_facility": {
          const v = (f.value ?? "").toLowerCase().trim()
          if (!v) break
          const doctors = client.doctors ?? []
          if (!doctors.length) return false
          const match = doctors.some((d) => {
            const fa = (d.facilityAddress ?? "").toLowerCase()
            return fa.includes(v)
          })
          if (!match) return false
          break
        }
        case "pharmacy_name": {
          const selected = parseMultiselectValue(f.value ?? "")
          if (!selected.length) break
          const pharmacies = client.pharmacies ?? []
          if (!pharmacies.length) return false
          const selectedSet = new Set(selected.map((s) => s.toLowerCase().trim()))
          const match = pharmacies.some((p) => selectedSet.has((p.name ?? "").toLowerCase().trim()))
          if (!match) return false
          break
        }
        case "rx_name": {
          const selected = parseMultiselectValue(f.value ?? "")
          if (!selected.length) break
          const meds = client.medications ?? []
          if (!meds.length) return false
          const selectedSet = new Set(selected.map((s) => s.toLowerCase().trim()))
          const match = meds.some((m) => {
            const names = [(m.name ?? "").trim(), (m.drugName ?? "").trim()].filter(Boolean).map((n) => n.toLowerCase())
            return names.some((n) => selectedSet.has(n))
          })
          if (!match) return false
          break
        }
        case "coverage_plan_type":
        case "coverage_status":
        case "coverage_carrier":
        case "coverage_plan_name":
        case "coverage_contract_number":
        case "coverage_written_as":
        case "coverage_election_period": {
          const isMultiselect = [
            "coverage_plan_type",
            "coverage_status",
            "coverage_carrier",
            "coverage_written_as",
            "coverage_election_period",
          ].includes(f.field)
          const selected = isMultiselect ? parseMultiselectValue(f.value ?? "") : null
          if (isMultiselect && (!selected || selected.length === 0)) break
          const coverages = client.coverages ?? []
          if (!coverages.length) return false
          const hasMatch = coverages.some((c) => {
            if (f.field === "coverage_plan_type") {
              if (!selected?.length) return false
              const planTypeNorm = (c.planType ?? "").trim().toLowerCase()
              return selected.some((s) => (s ?? "").trim().toLowerCase() === planTypeNorm)
            }
            if (f.field === "coverage_status") {
              return selected && selected.includes(c.status)
            }
            if (f.field === "coverage_written_as") {
              return selected && selected.includes(c.writtenAs ?? "")
            }
            if (f.field === "coverage_election_period") {
              return selected && selected.includes(c.electionPeriod ?? "")
            }
            if (f.field === "coverage_carrier") {
              const carrier = (c.carrier ?? "").trim()
              const selectedSet = new Set(selected!.map((s) => s.trim()))
              return carrier && selectedSet.has(carrier)
            }
            if (f.field === "coverage_plan_name") {
              const planName = (c.planName ?? "").toLowerCase()
              const v = (f.value ?? "").toLowerCase().trim()
              return v && planName.includes(v)
            }
            if (f.field === "coverage_contract_number") {
              const num = (c.memberPolicyNumber ?? "").toLowerCase()
              const v = (f.value ?? "").toLowerCase().trim()
              return v && num.includes(v)
            }
            return true
          })
          if (!hasMatch) return false
          break
        }
        case "coverage_effective_date": {
          const from = f.value ? new Date(f.value) : null
          const to = f.valueTo ? new Date(f.valueTo) : null
          if (!from && !to) break
          const coverages = client.coverages ?? []
          if (!coverages.length) return false
          const hasMatch = coverages.some((c) => {
            const d = c.effectiveDate ? new Date(c.effectiveDate) : null
            if (!d) return false
            if (from && d < from) return false
            if (to && d > to) return false
            return true
          })
          if (!hasMatch) return false
          break
        }
        case "coverage_application_date": {
          const from = f.value ? new Date(f.value) : null
          const to = f.valueTo ? new Date(f.valueTo) : null
          if (!from && !to) break
          const coverages = client.coverages ?? []
          if (!coverages.length) return false
          const hasMatch = coverages.some((c) => {
            const d = c.applicationDate ? new Date(c.applicationDate) : null
            if (!d) return false
            if (from && d < from) return false
            if (to && d > to) return false
            return true
          })
          if (!hasMatch) return false
          break
        }
        default:
          break
      }
    }
    return true
  })
}
