/** Option list for coverage status dropdown (general + pre-submission). */
export const COVERAGE_STATUS_OPTIONS: { value: string; label: string; separator?: boolean }[] = [
  { value: "Active", label: "Active" },
  { value: "Active (not agent of record)", label: "Active (not agent of record)" },
  { value: "Pending/Submitted", label: "Pending/Submitted" },
  { value: "Pending (not agent of record)", label: "Pending (not agent of record)" },
  { value: "Replaced", label: "Replaced" },
  { value: "Canceled", label: "Canceled" },
  { value: "Disenrolled", label: "Disenrolled" },
  { value: "Declined", label: "Declined" },
  { value: "Withdrawn", label: "Withdrawn" },
  { value: "Terminated", label: "Terminated" },
  { value: "Active (non-commissionable)", label: "Active (non-commissionable)" },
  { value: "", label: "PRE SUBMISSION", separator: true },
  { value: "Kit Mailed", label: "Kit Mailed" },
  { value: "Kit Emailed", label: "Kit Emailed" },
  { value: "eSign Sent", label: "eSign Sent" },
]

/** Statuses that count as "active" for enabling the Replacing dropdown. */
export const ACTIVE_COVERAGE_STATUSES = [
  "Active",
  "Active (not agent of record)",
  "Active (non-commissionable)",
] as const

export function isActiveCoverageStatus(status: string): boolean {
  return (ACTIVE_COVERAGE_STATUSES as readonly string[]).includes(status)
}

/** Option list for Written As dropdown. */
export const WRITTEN_AS_OPTIONS: { value: string; label: string }[] = [
  { value: "New to Medicare", label: "New to Medicare" },
  { value: "Like Plan Change", label: "Like Plan Change" },
  { value: "Like Plan Change (same company)", label: "Like Plan Change (same company)" },
  { value: "Unlike Plan Change", label: "Unlike Plan Change" },
  { value: "AOR Change", label: "AOR Change" },
  { value: "NA", label: "NA" },
]

/** Option list for Election Period dropdown. */
export const ELECTION_PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "AEP", label: "AEP" },
  { value: "IEP", label: "IEP" },
  { value: "ICEP", label: "ICEP" },
  { value: "OEP", label: "OEP" },
  { value: "OEPI", label: "OEPI" },
  { value: "OEPN", label: "OEPN" },
  { value: "SEP Dual Change of Status", label: "SEP Dual Change of Status" },
  { value: "SEP Service Area", label: "SEP Service Area" },
  { value: "SEP EGHP Loss", label: "SEP EGHP Loss" },
  { value: "SEP Chronic", label: "SEP Chronic" },
  { value: "SEP Maintaining", label: "SEP Maintaining" },
  { value: "SEP 5-Star", label: "SEP 5-Star" },
  { value: "SEP Disaster", label: "SEP Disaster" },
  { value: "SEP Creditable Coverage", label: "SEP Creditable Coverage" },
  { value: "SEP Plan Closure", label: "SEP Plan Closure" },
  { value: "SEP Other", label: "SEP Other" },
]

/** Plan type options for add-coverage step 1. */
export const COVERAGE_PLAN_TYPE_OPTIONS = [
  { value: "MAPD", label: "MAPD" },
  { value: "PDP", label: "PDP" },
  { value: "Med Supp", label: "Med Supp" },
] as const

/** Billing method options (all plan types). */
export const BILLING_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "EFT", label: "EFT" },
  { value: "SSA Deduction", label: "SSA Deduction" },
  { value: "SSI Deduction", label: "SSI Deduction" },
  { value: "Direct Bill (M)", label: "Direct Bill (M)" },
  { value: "Direct Bill (Q)", label: "Direct Bill (Q)" },
  { value: "Direct Bill (S)", label: "Direct Bill (S)" },
  { value: "Direct Bill (A)", label: "Direct Bill (A)" },
  { value: "Credit Card", label: "Credit Card" },
]

/** Draft day options (1–28 for monthly billing). */
export const DRAFT_DAY_OPTIONS: { value: string; label: string }[] = Array.from(
  { length: 28 },
  (_, i) => {
    const d = i + 1
    const suffix = d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"
    return { value: String(d), label: `${d}${suffix}` }
  }
)

/** Enrollment method options. */
export const ENROLLMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "Paper", label: "Paper" },
  { value: "Electronic", label: "Electronic" },
  { value: "Phone", label: "Phone" },
  { value: "eSign", label: "eSign" },
  { value: "Other", label: "Other" },
]

/** New to book or rewrite options. */
export const NEW_TO_BOOK_OR_REWRITE_OPTIONS: { value: string; label: string }[] = [
  { value: "New to book", label: "New to book" },
  { value: "Rewrite", label: "Rewrite" },
]
