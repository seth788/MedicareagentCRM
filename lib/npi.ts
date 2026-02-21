/**
 * NPI Registry API helpers and taxonomy mapping for provider search.
 * API: https://npiregistry.cms.hhs.gov/api-page (version 2.1)
 */

/** Display label -> NPI taxonomy_description for API queries (sorted alphabetically by label) */
export const SPECIALTY_OPTIONS: { label: string; taxonomyDescription: string }[] = [
  { label: "Cardiology", taxonomyDescription: "Cardiology" },
  { label: "Dermatology", taxonomyDescription: "Dermatology" },
  { label: "Endocrinology", taxonomyDescription: "Endocrinology, Diabetes & Metabolism" },
  { label: "Gastroenterology", taxonomyDescription: "Gastroenterology" },
  { label: "Internal Medicine", taxonomyDescription: "Internal Medicine" },
  { label: "Nephrology", taxonomyDescription: "Nephrology" },
  { label: "Neurology", taxonomyDescription: "Neurology" },
  { label: "Obstetrics & Gynecology", taxonomyDescription: "Obstetrics & Gynecology" },
  { label: "Ophthalmology", taxonomyDescription: "Ophthalmology" },
  { label: "Orthopedic Surgery", taxonomyDescription: "Orthopaedic Surgery" },
  { label: "PCP", taxonomyDescription: "Family Medicine" },
  { label: "Psychiatry", taxonomyDescription: "Psychiatry" },
  { label: "Pulmonology", taxonomyDescription: "Pulmonary Disease" },
  { label: "Rheumatology", taxonomyDescription: "Rheumatology" },
  { label: "Urology", taxonomyDescription: "Urology" },
]

export const DEFAULT_SPECIALTY = "PCP"

/** NPI taxonomy_description for pharmacy (organizations). */
export const PHARMACY_TAXONOMY = "Pharmacy"

export function getTaxonomyDescriptionByLabel(label: string): string {
  const found = SPECIALTY_OPTIONS.find((o) => o.label === label)
  return found?.taxonomyDescription ?? "Family Medicine"
}

/** Resolve stored specialty (label or taxonomy description, e.g. from NPI) to dropdown label */
export function getLabelBySpecialty(s: string | undefined): string {
  if (!s?.trim()) return DEFAULT_SPECIALTY
  const found = SPECIALTY_OPTIONS.find(
    (o) => o.label === s.trim() || o.taxonomyDescription === s.trim()
  )
  return found?.label ?? DEFAULT_SPECIALTY
}

/** Normalized NPI result for client consumption */
export interface NPIResultDTO {
  npi: string
  /** Individual: first name. Organization: unused. */
  firstName: string
  /** Individual: last name. Organization: unused. */
  lastName: string
  /** Organization legal name (NPI-2 only). */
  organizationName?: string
  /** Preferred display name (e.g. DBA / Other Name like "CVS Pharmacy #03476"). Use this for UI when set. */
  organizationDisplayName?: string
  /** "individual" = NPI-1, "organization" = NPI-2 */
  entityType: "individual" | "organization"
  specialty: string
  phone: string
  facilityAddress: string
}

/** Raw NPI API result entry (subset we use) */
interface NPIAddress {
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  postal_code?: string
  telephone_number?: string
  address_purpose?: string
}

interface NPIBasic {
  first_name?: string
  last_name?: string
  organization_name?: string
}

interface NPITaxonomy {
  desc?: string
  primary?: boolean
}

/** Other Organization Name from NPI API (e.g. DBA, "Other"). May be present in API response. */
interface NPIOtherName {
  organization_name?: string
  code?: string
  type?: string
}

interface NPIResultRaw {
  number: string
  basic?: NPIBasic
  addresses?: NPIAddress[]
  taxonomies?: NPITaxonomy[]
  other_names?: NPIOtherName[]
}

export function normalizeNPIResult(entry: NPIResultRaw): NPIResultDTO {
  const basic = entry.basic ?? {}
  const loc = (entry.addresses ?? []).find((a) => a.address_purpose === "LOCATION") ?? entry.addresses?.[0]
  const primaryTax = (entry.taxonomies ?? []).find((t) => t.primary) ?? entry.taxonomies?.[0]
  const parts = [loc?.address_1, loc?.address_2, loc?.city, loc?.state, loc?.postal_code].filter(Boolean)
  const facilityAddress = parts.join(", ") || ""
  const orgName = String(basic.organization_name ?? "").trim()
  if (orgName) {
    const firstOtherName = (entry.other_names ?? []).find(
      (o) => typeof o.organization_name === "string" && o.organization_name.trim() !== ""
    )
    const organizationDisplayName = firstOtherName?.organization_name?.trim() || undefined
    return {
      npi: String(entry.number ?? ""),
      firstName: "",
      lastName: "",
      organizationName: orgName,
      organizationDisplayName: organizationDisplayName || undefined,
      entityType: "organization",
      specialty: primaryTax?.desc ?? "",
      phone: loc?.telephone_number ?? "",
      facilityAddress,
    }
  }
  return {
    npi: String(entry.number ?? ""),
    firstName: String(basic.first_name ?? "").trim(),
    lastName: String(basic.last_name ?? "").trim(),
    entityType: "individual",
    specialty: primaryTax?.desc ?? "",
    phone: loc?.telephone_number ?? "",
    facilityAddress,
  }
}

export function filterByFacilityName(
  results: NPIResultDTO[],
  facilityName: string
): NPIResultDTO[] {
  if (!facilityName.trim()) return results
  const q = facilityName.trim().toLowerCase()
  return results.filter(
    (r) =>
      r.facilityAddress.toLowerCase().includes(q)
  )
}

/** Prefer display name (e.g. DBA) over legal name for organizations. */
export function getOrganizationDisplayName(r: NPIResultDTO): string {
  return (r.organizationDisplayName ?? r.organizationName ?? "").trim() || "Unknown"
}

/** Filter NPI results by organization name (and/or facility address). Used for pharmacy search. */
export function filterByOrganizationName(
  results: NPIResultDTO[],
  name: string
): NPIResultDTO[] {
  if (!name.trim()) return results
  const q = name.trim().toLowerCase()
  return results.filter(
    (r) =>
      (r.organizationName ?? "").toLowerCase().includes(q) ||
      (r.organizationDisplayName ?? "").toLowerCase().includes(q) ||
      r.facilityAddress.toLowerCase().includes(q)
  )
}
