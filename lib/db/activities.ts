import type { Activity } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"
import { getDisplayName } from "./profiles"

export async function fetchActivities(agentId: string): Promise<Activity[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("activities")
    .select("id, related_type, related_id, type, description, outcome, due_date, completed_at, created_at, created_by_agent_id")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
  if (error) throw error
  if (!data?.length) return []

  const agentIds = [...new Set(data.map((r) => r.created_by_agent_id).filter(Boolean))]
  const names: Record<string, string> = {}
  await Promise.all(
    agentIds.map(async (id) => {
      names[id] = await getDisplayName(supabase, id)
    })
  )

  return data.map((r) => ({
    id: r.id,
    relatedType: r.related_type,
    relatedId: r.related_id,
    type: r.type,
    description: r.description,
    outcome: r.outcome ?? undefined,
    dueDate: r.due_date ?? undefined,
    completedAt: r.completed_at ?? undefined,
    createdAt: r.created_at,
    createdBy: names[r.created_by_agent_id] ?? r.created_by_agent_id,
  }))
}

export async function insertActivity(
  agentId: string,
  activity: Activity
): Promise<Activity> {
  const supabase = await createClient()
  const id = activity.id && /^[0-9a-f-]{36}$/i.test(activity.id) ? activity.id : crypto.randomUUID()
  const { error } = await supabase.from("activities").insert({
    id,
    agent_id: agentId,
    created_by_agent_id: agentId,
    related_type: activity.relatedType,
    related_id: activity.relatedId,
    type: activity.type,
    description: activity.description,
    outcome: activity.outcome ?? null,
    due_date: activity.dueDate ?? null,
    completed_at: activity.completedAt ?? null,
  })
  if (error) throw error
  return { ...activity, id, createdBy: activity.createdBy }
}
