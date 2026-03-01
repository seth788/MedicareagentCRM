import type { Client } from "@/lib/types"
import { getPreferredOrFirstAddress, getPreferredOrFirstPhone, getPreferredOrFirstEmail } from "@/lib/utils"
import { applyFilters, type ReportFilter } from "@/lib/report-filters"

/** Flattened row for report table/CSV. Excludes Medicare number and Part A/B dates. */
export interface ReportRow {
  id: string
  status: string
  lastName: string
  firstName: string
  middleName: string
  suffix: string
  nickname: string
  gender: string
  source: string
  /** Shown only when multiple addresses; preferred or first. */
  address?: string
  /** Shown only when multiple emails; preferred or first. */
  email?: string
  /** Shown only when multiple phones; preferred or first. */
  phone?: string
  /** Single address/email/phone shown in base columns when only one exists. */
  addressSingle?: string
  emailSingle?: string
  phoneSingle?: string
  /** Coverage summary for Policies reports. */
  planTypes?: string[]
  carriers?: string[]
  effectiveDates?: string[]
  /** Agency name (for agency reports). */
  agency?: string
}

/** Whether to show the "Preferred" contact columns (only when multiple exist). */
export function shouldShowPreferredContact(client: Client): {
  address: boolean
  email: boolean
  phone: boolean
} {
  const addrs = client.addresses ?? []
  const emails = client.emails ?? []
  const phones = client.phones ?? []
  return {
    address: addrs.length > 1,
    email: emails.length > 1,
    phone: phones.length > 1,
  }
}

function formatAddress(client: Client): string {
  const a = getPreferredOrFirstAddress(client)
  if (!a) return ""
  const parts = [a.address, a.unit, a.city, a.state, a.zip].filter(Boolean)
  return parts.join(", ")
}

/** Converts a client to a ReportRow. Never includes Medicare number or Part A/B dates. */
export function clientToReportRow(client: Client): ReportRow {
  const pref = getPreferredOrFirstAddress(client)
  const prefPhone = getPreferredOrFirstPhone(client)
  const prefEmail = getPreferredOrFirstEmail(client)
  const show = shouldShowPreferredContact(client)

  const statusLabel =
    client.status === "lead"
      ? "Lead"
      : client.status === "inactive"
        ? "Inactive"
        : "Active Client"

  const row: ReportRow = {
    id: client.id,
    status: statusLabel,
    lastName: client.lastName ?? "",
    firstName: client.firstName ?? "",
    middleName: client.middleName ?? "",
    suffix: client.suffix ?? "",
    nickname: client.nickname ?? "",
    gender: client.gender === "M" ? "M" : client.gender === "F" ? "F" : "",
    source: client.source ?? "",
  }

  if (show.address) {
    row.address = formatAddress(client)
  } else if (pref) {
    row.addressSingle = formatAddress(client)
  }

  if (show.email) {
    row.email = prefEmail?.value ?? ""
  } else if (prefEmail) {
    row.emailSingle = prefEmail.value
  }

  if (show.phone) {
    row.phone = prefPhone?.number ?? ""
  } else if (prefPhone) {
    row.phoneSingle = prefPhone.number
  }

  if ((client.coverages ?? []).length > 0) {
    row.planTypes = [...new Set(client.coverages!.map((c) => c.planType))]
    row.carriers = [...new Set(client.coverages!.map((c) => c.carrier).filter(Boolean))]
    row.effectiveDates = client.coverages!.map((c) => c.effectiveDate).filter(Boolean)
  }

  return row
}

/** Filters clients and converts to ReportRows. Uses in-memory filter. */
export function getReportRows(
  clients: Client[],
  filters: ReportFilter[],
  agencyByClientId?: Record<string, string>
): ReportRow[] {
  const filtered = applyFilters(clients, filters, agencyByClientId)
  return filtered.map((client) => {
    const row = clientToReportRow(client)
    if (agencyByClientId?.[client.id]) {
      row.agency = agencyByClientId[client.id]
    }
    return row
  })
}

/** Escapes a CSV cell (quotes and doubles internal quotes). */
function escapeCsvCell(val: string): string {
  const s = String(val ?? "")
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Builds CSV string from report rows. Columns match visible table columns. */
export function reportRowsToCsv(rows: ReportRow[]): string {
  if (!rows.length) return ""

  const showAddress = rows.some((r) => r.address != null || r.addressSingle != null)
  const showEmail = rows.some((r) => r.email != null || r.emailSingle != null)
  const showPhone = rows.some((r) => r.phone != null || r.phoneSingle != null)
  const showCoverage = rows.some((r) => (r.planTypes?.length ?? 0) > 0)
  const showAgency = rows.some((r) => r.agency != null && r.agency !== "")

  const headers = [
    "ID",
    "Status",
    "Last",
    "First",
    "Middle",
    "Suffix",
    "Nickname",
    "Gender",
    "Source",
  ]
  if (showAgency) headers.push("Agency")
  if (showAddress) headers.push("Address")
  if (showEmail) headers.push("Email")
  if (showPhone) headers.push("Phone")
  if (showCoverage) headers.push("Coverage")

  const lines = [headers.map(escapeCsvCell).join(",")]

  for (const row of rows) {
    const addr = row.address ?? row.addressSingle ?? ""
    const email = row.email ?? row.emailSingle ?? ""
    const phone = row.phone ?? row.phoneSingle ?? ""
    const coverage = row.planTypes?.join("; ") ?? ""

    const cells = [
      row.id,
      row.status,
      row.lastName,
      row.firstName,
      row.middleName,
      row.suffix,
      row.nickname,
      row.gender,
      row.source,
    ]
    if (showAgency) cells.push(row.agency ?? "")
    if (showAddress) cells.push(addr)
    if (showEmail) cells.push(email)
    if (showPhone) cells.push(phone)
    if (showCoverage) cells.push(coverage)

    lines.push(cells.map(escapeCsvCell).join(","))
  }

  return lines.join("\r\n")
}
