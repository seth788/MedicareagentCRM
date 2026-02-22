import type { Task } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"

export async function fetchTasks(agentId: string): Promise<Task[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("agent_id", agentId)
    .order("due_date", { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    relatedType: r.related_type,
    relatedId: r.related_id,
    relatedName: r.related_name,
    title: r.title,
    description: r.description ?? undefined,
    dueDate: r.due_date,
    completedAt: r.completed_at ?? undefined,
    createdAt: r.created_at,
  }))
}

export async function insertTask(agentId: string, task: Task): Promise<Task> {
  const supabase = await createClient()
  const id = task.id && /^[0-9a-f-]{36}$/i.test(task.id) ? task.id : crypto.randomUUID()
  const { error } = await supabase.from("tasks").insert({
    id,
    agent_id: agentId,
    related_type: task.relatedType,
    related_id: task.relatedId,
    related_name: task.relatedName,
    title: task.title,
    description: task.description ?? null,
    due_date: task.dueDate,
    completed_at: task.completedAt ?? null,
  })
  if (error) throw error
  return { ...task, id }
}

export async function completeTask(agentId: string, taskId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("agent_id", agentId)
  if (error) throw error
}
