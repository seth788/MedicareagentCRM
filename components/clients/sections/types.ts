import type { Client, Activity, Task } from "@/lib/types"

export interface SectionProps {
  client: Client
  activities: Activity[]
  tasks: Task[]
  /** Optional: allows sections to request navigation to another section (e.g. Contact -> Notes) */
  onNavigateToSection?: (sectionId: SectionId) => void
}

export type SectionId =
  | "contact"
  | "health"
  | "medicare"
  | "coverage"
  | "notes"
