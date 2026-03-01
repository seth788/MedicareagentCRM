/**
 * Agency reports use a separate, restricted set of filters.
 * These are NOT added to the shared report-filters - they exist only for agency.
 */
import { COVERAGE_STATUS_OPTIONS } from "@/lib/coverage-options"
import type { ReportFilterField } from "@/lib/report-filters"

export const AGENCY_FILTER_FIELD_DEFINITIONS: {
  field: ReportFilterField
  label: string
  type: "text" | "date_range" | "multiselect"
  group?: "individual" | "policy"
  options?: readonly { value: string; label: string }[]
}[] = [
  { field: "client_agency", label: "Agency", type: "multiselect", group: "individual" },
  { field: "client_source", label: "Source", type: "multiselect", group: "individual" },
  { field: "coverage_plan_name", label: "Policy: Plan Name", type: "multiselect", group: "policy" },
  { field: "coverage_carrier", label: "Policy: Company", type: "multiselect", group: "policy" },
  {
    field: "coverage_status",
    label: "Policy: Status",
    type: "multiselect",
    group: "policy",
    options: COVERAGE_STATUS_OPTIONS.filter((o) => o.value !== ""),
  },
]
