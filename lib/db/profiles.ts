import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export type ThemeValue = "light" | "dark" | "system"

export type ProfileForSettings = {
  firstName: string
  lastName: string
  email: string
  npn: string
  theme: ThemeValue
}

export async function getProfile(agentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, first_name, last_name, npn, theme")
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
  return {
    firstName: first || (display ? display.split(/\s+/)[0] ?? "" : ""),
    lastName: last || (display ? display.split(/\s+/).slice(1).join(" ") ?? "" : ""),
    email: email ?? "",
    npn: (row?.npn as string | null)?.trim() ?? "",
    theme,
  }
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
    .select("id, display_name, theme")
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
  updates: { firstName: string; lastName: string; npn: string; theme?: ThemeValue }
) {
  const supabase = await createClient()
  const displayName = [updates.firstName, updates.lastName].filter(Boolean).join(" ").trim() || null
  const row: Record<string, unknown> = {
    first_name: updates.firstName.trim() || null,
    last_name: updates.lastName.trim() || null,
    npn: updates.npn.trim() || null,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  }
  if (updates.theme !== undefined) row.theme = updates.theme
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
