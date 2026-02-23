import type { Lead, Client, Activity, Task } from "./types"

/**
 * Returns the effective "last touched" timestamp for a lead for display.
 * Prefers the DB-backed lastTouchedAt (per-flow) when present; otherwise
 * derives from created/updated dates, client, activities, and tasks.
 */
export function getLeadLastTouchedAt(
  lead: Lead,
  context: { clients: Client[]; activities: Activity[]; tasks: Task[] }
): string | null {
  if (lead.lastTouchedAt) return lead.lastTouchedAt
  const { clients, activities, tasks } = context
  const dates: number[] = [
    new Date(lead.createdAt).getTime(),
    new Date(lead.updatedAt).getTime(),
  ]
  const relatedIds = new Set<string>([lead.id])
  if (lead.clientId) {
    relatedIds.add(lead.clientId)
    const client = clients.find((c) => c.id === lead.clientId)
    if (client?.updatedAt) dates.push(new Date(client.updatedAt).getTime())
  }
  for (const a of activities) {
    if (
      (a.relatedType === "Lead" && relatedIds.has(a.relatedId)) ||
      (a.relatedType === "Client" && relatedIds.has(a.relatedId))
    ) {
      dates.push(new Date(a.createdAt).getTime())
    }
  }
  for (const t of tasks) {
    if (
      (t.relatedType === "Lead" && relatedIds.has(t.relatedId)) ||
      (t.relatedType === "Client" && relatedIds.has(t.relatedId))
    ) {
      dates.push(new Date(t.createdAt).getTime())
    }
  }
  if (dates.length === 0) return null
  return new Date(Math.max(...dates)).toISOString()
}

/** Hours since timestamp (for last-touched color coding). */
export function hoursSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60)
}

/**
 * Tailwind class for last-touched age: normal (<24h), warning (1–3 days), danger (3+ days).
 */
export function lastTouchedColorClass(isoDate: string): string {
  const hours = hoursSince(isoDate)
  if (hours < 24) return "text-muted-foreground"
  if (hours < 72) return "text-amber-600 dark:text-amber-500"
  return "text-red-600 dark:text-red-400"
}
