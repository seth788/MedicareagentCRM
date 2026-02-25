"use server"

import { createClient } from "@/lib/supabase/server"
import { getProfileForSettings, updateProfileSettings as dbUpdateProfileSettings } from "@/lib/db/profiles"

export type ThemeValue = "light" | "dark" | "system"

export type SettingsProfile = {
  firstName: string
  lastName: string
  email: string
  npn: string
  theme: ThemeValue
  autoIssueApplications: boolean
}

export async function getSettingsProfile(): Promise<SettingsProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const email = user.email ?? ""
  return getProfileForSettings(user.id, email)
}

export async function updateProfileSettings(formData: {
  firstName: string
  lastName: string
  npn: string
  theme?: "light" | "dark" | "system"
  autoIssueApplications?: boolean
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  await dbUpdateProfileSettings(user.id, {
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    npn: formData.npn.trim(),
    theme: formData.theme,
    autoIssueApplications: formData.autoIssueApplications,
  })
}
