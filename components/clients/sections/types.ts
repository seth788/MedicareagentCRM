import type { Client, Activity, Task } from "@/lib/types"

export interface SectionProps {
  client: Client
  activities: Activity[]
  tasks: Task[]
  /** Optional: allows sections to request navigation to another section (e.g. Contact -> Notes) */
  onNavigateToSection?: (sectionId: SectionId) => void
  /** Optional: open edit dialog for personal details (name, DOB, language, household, gender, title, middle name, suffix, nickname, fun facts) */
  onEditPersonal?: () => void
  /** Optional: open edit dialog for contact info only (phone, email, preferred) */
  onEditContact?: () => void
  /** Optional: open edit dialog for addresses only */
  onEditAddresses?: () => void
  /** Optional: open edit dialog for Medicare info only */
  onEditMedicare?: () => void
}

export type SectionId =
  | "contact"
  | "health"
  | "medicare"
  | "coverage"
  | "notes"
