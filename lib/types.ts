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

export interface Lead {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  source: LeadSource
  flowId: string
  stageId: string
  notes: string[]
  tags: string[]
  assignedTo: string
  createdAt: string
  updatedAt: string
  nextFollowUpAt: string | null
  dob?: string
  /** Set when lead was created from a client profile; used to show "Remove from leads" and to remove the right lead */
  clientId?: string
}

export interface Doctor {
  name: string
  specialty: string
  phone: string
}

export interface Medication {
  name: string
  dosage: string
  frequency: string
}

export interface Pharmacy {
  name: string
  phone: string
  address: string
}

export type PlanType = "MA" | "MAPD" | "PDP" | "Supp"

export interface Coverage {
  planType: PlanType
  carrier: string
  planName: string
  effectiveDate: string
  applicationId: string
  premium: number
  lastReviewDate: string
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zip: string
  dob: string
  turning65Date: string
  preferredContactMethod: "phone" | "email" | "text"
  language: string
  householdMembers?: string[]
  medicareNumber: string
  partAEffectiveDate: string
  partBEffectiveDate: string
  doctors: Doctor[]
  medications: Medication[]
  pharmacies: Pharmacy[]
  allergies: string[]
  conditions: string[]
  coverage?: Coverage
  createdAt: string
  updatedAt: string
}

export type ActivityType = "call" | "email" | "text" | "appointment" | "note"

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
