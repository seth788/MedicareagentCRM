export type LeadSource = "Facebook" | "Referral" | "Website" | "Call-in" | "Direct Mail" | "Event"

/** Legacy stage names; used only for migration/seed. Leads use flowId + stageId. */
export type LeadStage =
  | "New"
  | "Contacted"
  | "Scheduled"
  | "No-Show"
  | "Nurture"
  | "Converted"
  | "Closed-Lost"

export interface Flow {
  id: string
  name: string
  order: number
  isDefault: boolean
  createdAt: string
}

export interface Stage {
  id: string
  flowId: string
  name: string
  order: number
  colorKey?: string
}

/** A single note with timestamp (stored as ISO string, displayed in user's local time). */
export interface NoteEntry {
  text: string
  createdAt: string
  /** Set when the note was last edited; omitted if never edited. */
  updatedAt?: string
}

export interface Lead {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  source: LeadSource
  flowId: string
  stageId: string
  notes: NoteEntry[]
  tags: string[]
  assignedTo: string
  createdAt: string
  updatedAt: string
  /** Per-flow: last time this client was touched (stage change, note, activity, profile edit). */
  lastTouchedAt?: string
  nextFollowUpAt: string | null
  dob?: string
  /** Set when lead was created from a client profile; used to show "Remove from leads" and to remove the right lead */
  clientId?: string
}

export type DoctorImportance = "essential" | "preferred" | "flexible"

export interface Doctor {
  name: string
  specialty: string
  phone: string
  /** NPI-sourced; prefer with firstName + lastName for display */
  firstName?: string
  lastName?: string
  providerId?: string
  facilityAddress?: string
  /** Single note for the consumer (e.g. special instructions); only editable when editing the doctor */
  note?: string
  /** Importance level: Essential (red), Preferred (yellow, default from search), Flexible (green) */
  importance?: DoctorImportance
}

export interface Medication {
  /** Display name (e.g. from NLM typeahead); kept for list display and backward compat */
  name: string
  /** Dosage/variant display for list (backward compat); prefer dosageDisplay when set */
  dosage?: string
  frequency: string
  /** Default 30 in UI when adding */
  quantity?: number
  notes?: string
  /** ISO date or date-only */
  firstPrescribed?: string
  /** @deprecated prefer drugName, dosageDisplay, doseForm, isPackageDrug, packageDescription, packageNdc */
  package?: string
  allowGenerics?: boolean
  /** RxNorm concept ID (selected SCD/SBD) */
  rxcui?: string
  ndcs?: string[]
  /** Display name from typeahead (Layer 1) */
  drugName?: string
  /** Full concept name from RxNorm (e.g. "insulin lispro 100 UNT/mL Cartridge [Humalog]") */
  dosageDisplay?: string
  /** Extracted dose form string (e.g. "Cartridge", "Oral Tablet") */
  doseForm?: string
  /** True when dose form is package-required (injectable, inhaler, etc.) */
  isPackageDrug?: boolean
  /** Human-readable package (e.g. "5 CARTRIDGES in 1 CARTON"); only for package drugs */
  packageDescription?: string
  /** NDC for selected package; only for package drugs */
  packageNdc?: string
  /** Brand name when drug is branded (SBD); used to show "Brand" pill */
  brandName?: string
}

export interface Pharmacy {
  name: string
  phone: string
  address: string
}

export type PlanType = "MA" | "MAPD" | "PDP" | "Supp"

/** Plan type for new coverage flow. */
export type CoveragePlanType = "MAPD" | "PDP" | "Med Supp"

export type AddressType = "Home" | "Mailing" | "Secondary Home" | "Secondary Mailing"

export interface ClientAddress {
  id: string
  type: AddressType
  address: string
  unit?: string
  city: string
  county?: string
  state: string
  zip: string
  isPreferred: boolean
}

export type ClientPhoneType = "Cell" | "Home" | "Work" | "Other"

export interface ClientPhone {
  id: string
  number: string
  type: ClientPhoneType
  isPreferred: boolean
  note?: string
}

export interface ClientEmail {
  id: string
  value: string
  isPreferred: boolean
  note?: string
}

export interface Coverage {
  id: string
  planType: CoveragePlanType
  companyId?: string
  carrier: string
  planId?: string
  planName: string
  status: string
  applicationDate: string
  effectiveDate: string
  writtenAs: string
  electionPeriod: string
  memberPolicyNumber: string
  replacingCoverageId?: string
  applicationId: string
  hraCollected: boolean
  commissionStatus?: string
  notes?: string
  /** Med Supp / PDP: monthly premium in dollars */
  premium?: number
  /** Med Supp / PDP: bonus amount */
  bonus?: number
  /** Med Supp / PDP: billing method */
  billingMethod?: string
  /** Med Supp / PDP: draft day (1-28) */
  draftDay?: string
  /** Med Supp / PDP: enrollment method */
  enrollmentMethod?: string
  /** Med Supp / PDP: new to book or rewrite */
  newToBookOrRewrite?: string
  createdAt?: string
  updatedAt?: string
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  /** Mr., Mrs., Miss, Ms., Dr., etc. */
  title?: string
  middleName?: string
  /** Jr., Sr., II, III, IV, etc. */
  suffix?: string
  nickname?: string
  gender?: "M" | "F"
  funFacts?: string
  phones: ClientPhone[]
  emails: ClientEmail[]
  addresses: ClientAddress[]
  dob: string
  turning65Date: string
  preferredContactMethod: "phone" | "email" | "text"
  language: string
  /** @deprecated Use spouseId for spouse linking. */
  householdMembers?: string[]
  /** Client id of linked spouse; link is bidirectional. */
  spouseId?: string
  /** Never populated in list/detail; use reveal API to fetch. Empty string when not revealed. */
  medicareNumber: string
  /** True when client has a Medicare number on file (allows showing Reveal button). */
  hasMedicareNumber?: boolean
  partAEffectiveDate: string
  partBEffectiveDate: string
  doctors: Doctor[]
  medications: Medication[]
  pharmacies: Pharmacy[]
  allergies: string[]
  conditions: string[]
  /** Selected items from the fixed health tracker list (condition/disorder/disease checkboxes) */
  healthTracker?: string[]
  /** How the client was acquired (e.g. Website, Facebook, Referral); agents can add custom sources. */
  source?: string
  /** Agent-set: active, lead, or inactive. */
  status?: "active" | "lead" | "inactive"
  /** Agent-added notes (free-form) with timestamps; action-based events are in the activity timeline. */
  notes?: NoteEntry[]
  /** Multiple plans per client (MAPD, PDP, etc.). */
  coverages: Coverage[]
  /** Public URL for client profile/avatar image. */
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export type ActivityType = "call" | "email" | "text" | "appointment" | "note" | "coverage" | "flow"

export interface Activity {
  id: string
  relatedType: "Lead" | "Client"
  relatedId: string
  type: ActivityType
  description: string
  outcome?: string
  dueDate?: string
  completedAt?: string
  createdAt: string
  createdBy: string
}

export interface Task {
  id: string
  relatedType: "Lead" | "Client"
  relatedId: string
  relatedName: string
  title: string
  description?: string
  dueDate: string
  completedAt?: string
  createdAt: string
}
