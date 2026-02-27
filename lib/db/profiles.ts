import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export type ThemeValue = "light" | "dark" | "system"

export type ProfileForSettings = {
  firstName: string
  lastName: string
  email: string
  phone: string
  npn: string
  theme: ThemeValue
  autoIssueApplications: boolean
  taskReminderEmails: boolean
  turning65Alerts: boolean
  avatarUrl: string | null
}

export async function getProfile(agentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, first_name, last_name, phone, npn, theme, auto_issue_applications, task_reminder_emails, turning_65_alerts, avatar_url")
    .eq("id", agentId)
    .single()
  if (error && error.code !== "PGRST116") throw error
  return data
}

export async function getProfileForSettings(
  agentId: string,
  email: string
): Promise<ProfileForSettings> {
  const row = await getProfile(agentId)
  const first = (row?.first_name as string | null)?.trim() ?? ""
  const last = (row?.last_name as string | null)?.trim() ?? ""
  const display = (row?.display_name as string | null)?.trim()
  const themeRaw = (row?.theme as string | null)?.trim()
  const theme: ThemeValue =
    themeRaw === "dark" || themeRaw === "system" ? themeRaw : "light"
  const autoIssue =
    (row?.auto_issue_applications as boolean | null) ?? true
  const taskReminderEmails = (row?.task_reminder_emails as boolean | null) ?? true
  const turning65Alerts = (row?.turning_65_alerts as boolean | null) ?? true
  const avatarUrl = (row?.avatar_url as string | null)?.trim() || null
  const phone = (row?.phone as string | null)?.trim() ?? ""
  return {
    firstName: first || (display ? display.split(/\s+/)[0] ?? "" : ""),
    lastName: last || (display ? display.split(/\s+/).slice(1).join(" ") ?? "" : ""),
    email: email ?? "",
    phone,
    npn: (row?.npn as string | null)?.trim() ?? "",
    theme,
    autoIssueApplications: autoIssue,
    taskReminderEmails,
    turning65Alerts,
    avatarUrl,
  }
}

export async function updateProfileAvatar(agentId: string, avatarUrl: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", agentId)
  if (error) throw error
}

export async function getOrCreateProfile(agentId: string, displayName?: string) {
  const supabase = await createClient()
  const existing = await getProfile(agentId)
  if (existing) return existing
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: agentId,
      display_name: displayName ?? null,
    })
    .select("id, display_name, theme, auto_issue_applications, avatar_url")
    .single()
  if (error) throw error
  return data
}

export async function updateDisplayName(agentId: string, displayName: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", agentId)
  if (error) throw error
}

export async function updateProfileSettings(
  agentId: string,
  updates: {
    firstName: string
    lastName: string
    phone: string
    npn: string
    theme?: ThemeValue
    autoIssueApplications?: boolean
    taskReminderEmails?: boolean
    turning65Alerts?: boolean
  }
) {
  const supabase = await createClient()
  const displayName = [updates.firstName, updates.lastName].filter(Boolean).join(" ").trim() || null
  const row: Record<string, unknown> = {
    first_name: updates.firstName.trim() || null,
    last_name: updates.lastName.trim() || null,
    phone: updates.phone.trim() || null,
    npn: updates.npn.trim() || null,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  }
  if (updates.theme !== undefined) row.theme = updates.theme
  if (updates.autoIssueApplications !== undefined)
    row.auto_issue_applications = updates.autoIssueApplications
  if (updates.taskReminderEmails !== undefined)
    row.task_reminder_emails = updates.taskReminderEmails
  if (updates.turning65Alerts !== undefined)
    row.turning_65_alerts = updates.turning65Alerts
  const { error } = await supabase.from("profiles").update(row).eq("id", agentId)
  if (error) throw error
}

export async function updateNotificationPreferences(
  agentId: string,
  prefs: { taskReminderEmails?: boolean; turning65Alerts?: boolean }
) {
  const supabase = await createClient()
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (prefs.taskReminderEmails !== undefined) row.task_reminder_emails = prefs.taskReminderEmails
  if (prefs.turning65Alerts !== undefined) row.turning_65_alerts = prefs.turning65Alerts
  const { error } = await supabase.from("profiles").update(row).eq("id", agentId)
  if (error) throw error
}

export async function getDisplayName(
  supabase: SupabaseClient,
  agentId: string
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", agentId)
    .single()
  const name = data?.display_name?.trim()
  if (name) return name
  return agentId
}
