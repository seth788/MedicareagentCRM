import type { AgencyReportColumn } from "@/components/agency/agency-report-table"

type GenericRow = Record<string, unknown>

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const
const MONTH_HEADERS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export const PRODUCTION_COLUMNS: AgencyReportColumn<GenericRow>[] = [
  { key: "agentName", header: "Agent" },
  ...MONTH_KEYS.map((k, i) => ({ key: k, header: MONTH_HEADERS[i], align: "right" as const })),
  { key: "yearTotal", header: "Year", align: "right" },
]

export const ROSTER_COLUMNS: AgencyReportColumn<GenericRow>[] = [
  { key: "displayName", header: "Agent" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "role", header: "Role" },
  { key: "organizationName", header: "Agency" },
  { key: "clientCount", header: "Clients", align: "right" },
  { key: "policyCount", header: "Policies", align: "right" },
  { key: "npn", header: "NPN" },
  { key: "status", header: "Status" },
]

export const CLIENTS_COLUMNS: AgencyReportColumn<GenericRow>[] = [
  { key: "agentName", header: "Agent" },
  { key: "agencyName", header: "Agency" },
  { key: "total", header: "Total", align: "right" },
  { key: "new", header: "New", align: "right" },
  { key: "active", header: "Active", align: "right" },
  { key: "lead", header: "Lead", align: "right" },
  { key: "inactive", header: "Inactive", align: "right" },
]

/** Policy-level sales row (one per coverage) for agency custom report with effective date range. */
export interface PolicySalesRow {
  id: string
  clientId: string
  agentFirst: string
  agentLast: string
  status: string
  source: string
  memberFirst: string
  memberLast: string
  providerFirst: string
  providerLast: string
  providerNetworks: string
  policyType: string
  policyStatus: string
  policyCompany: string
  policyPlanName: string
  policyNumber: string
  policyEffectiveDate: string
  policyApplicationDate: string
}

export const AGENCY_SALES_COLUMNS: AgencyReportColumn<PolicySalesRow>[] = [
  { key: "agentFirst", header: "Agent First" },
  { key: "agentLast", header: "Agent Last" },
  { key: "status", header: "Status" },
  { key: "source", header: "Source" },
  { key: "memberFirst", header: "Member First" },
  { key: "memberLast", header: "Member Last" },
  { key: "providerFirst", header: "Provider First" },
  { key: "providerLast", header: "Provider Last" },
  { key: "providerNetworks", header: "Provider Networks" },
  { key: "policyType", header: "Policy Type" },
  { key: "policyStatus", header: "Policy Status" },
  { key: "policyCompany", header: "Policy Company" },
  { key: "policyPlanName", header: "Policy Plan Name" },
  { key: "policyNumber", header: "Policy Number" },
  { key: "policyEffectiveDate", header: "Policy Effective Date" },
  { key: "policyApplicationDate", header: "Policy Application Date" },
]

/** Convert generic rows to CSV string. Uses column keys for headers. */
export function genericRowsToCsv(
  columns: { key: string; header: string }[],
  rows: Record<string, unknown>[]
): string {
  const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`)
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      columns
        .map((c) => {
          const v = row[c.key]
          const s = v == null || v === "" ? "" : String(v)
          return `"${s.replace(/"/g, '""')}"`
        })
        .join(",")
    ),
  ]
  return lines.join("\n")
}
