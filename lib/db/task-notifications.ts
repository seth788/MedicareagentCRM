import type { SupabaseClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/resend"
import { getAppUrl } from "@/lib/emails/soa"
import {
  taskNotificationHtml,
  taskNotificationText,
} from "@/lib/emails/task-notification"

const FROM_EMAIL = "notifications@advantacrm.com"

interface TaskRow {
  id: string
  agent_id: string
  related_type: "Client" | "Lead"
  related_id: string
  related_name: string
  title: string
  description: string | null
  due_date: string
}

/**
 * Run task notification cron: find tasks due now (or past due) that haven't
 * been notified, send reminder emails to agents, and mark notification_sent_at.
 * Uses service role client.
 */
export async function runTaskNotificationsCron(
  supabase: SupabaseClient
): Promise<{ sent: number; errors: string[] }> {
  const now = new Date().toISOString()

  const { data: optedInAgents, error: agentError } = await supabase
    .from("profiles")
    .select("id")
    .or("task_reminder_emails.eq.true,task_reminder_emails.is.null")
  if (agentError) throw agentError
  const agentIds = (optedInAgents ?? []).map((r) => r.id as string)
  if (agentIds.length === 0) return { sent: 0, errors: [] }

  const { data: tasks, error: fetchError } = await supabase
    .from("tasks")
    .select("id, agent_id, related_type, related_id, related_name, title, description, due_date")
    .in("agent_id", agentIds)
    .is("completed_at", null)
    .is("notification_sent_at", null)
    .lte("due_date", now)
    .order("due_date", { ascending: true })

  if (fetchError) throw fetchError
  const rows = (tasks ?? []) as TaskRow[]
  if (rows.length === 0) return { sent: 0, errors: [] }

  const appUrl = getAppUrl()
  const errors: string[] = []
  let sent = 0

  for (const task of rows) {
    const { data: agentUser } = await supabase.auth.admin.getUserById(task.agent_id)
    const agentEmail = agentUser?.user?.email
    if (!agentEmail) {
      errors.push(`Task ${task.id}: Agent has no email`)
      continue
    }

    const dueDate = new Date(task.due_date)
    const dueAtFormatted = dueDate.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })

    const taskUrl =
      task.related_type === "Client"
        ? `${appUrl}/clients/${task.related_id}?section=contact`
        : `${appUrl}/flows`

    const result = await sendEmail({
      from: FROM_EMAIL,
      to: [agentEmail],
      subject: `Task reminder: ${task.title}`,
      fromName: "AdvantaCRM",
      text: taskNotificationText({
        taskTitle: task.title,
        relatedName: task.related_name,
        relatedType: task.related_type,
        dueAtFormatted,
        description: task.description ?? undefined,
        taskUrl,
      }),
      html: taskNotificationHtml({
        taskTitle: task.title,
        relatedName: task.related_name,
        relatedType: task.related_type,
        dueAtFormatted,
        description: task.description ?? undefined,
        taskUrl,
      }),
    })

    if (!result.ok) {
      errors.push(`Task ${task.id}: ${result.error}`)
      continue
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ notification_sent_at: now })
      .eq("id", task.id)

    if (updateError) {
      errors.push(`Task ${task.id}: Failed to mark notified: ${updateError.message}`)
    } else {
      sent++
    }
  }

  return { sent, errors }
}

/**
 * Debug helper: list tasks that would be notified (no emails sent, no updates).
 */
export async function debugTaskNotifications(supabase: SupabaseClient): Promise<{
  tasksDueCount: number
  now: string
  tasks: { id: string; title: string; due_date: string; agent_id: string; agent_email: string | null }[]
}> {
  const now = new Date().toISOString()
  const { data: optedInAgents } = await supabase
    .from("profiles")
    .select("id")
    .or("task_reminder_emails.eq.true,task_reminder_emails.is.null")
  const agentIds = (optedInAgents ?? []).map((r) => r.id as string)
  if (agentIds.length === 0) {
    return { tasksDueCount: 0, now, tasks: [] }
  }
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, agent_id, title, due_date")
    .in("agent_id", agentIds)
    .is("completed_at", null)
    .is("notification_sent_at", null)
    .lte("due_date", now)
    .order("due_date", { ascending: true })

  if (error) throw error
  const rows = (tasks ?? []) as { id: string; agent_id: string; title: string; due_date: string }[]
  const tasksWithEmail: { id: string; title: string; due_date: string; agent_id: string; agent_email: string | null }[] = []
  for (const t of rows) {
    const { data: agentUser } = await supabase.auth.admin.getUserById(t.agent_id)
    tasksWithEmail.push({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
      agent_id: t.agent_id,
      agent_email: agentUser?.user?.email ?? null,
    })
  }
  return {
    tasksDueCount: rows.length,
    now,
    tasks: tasksWithEmail,
  }
}
