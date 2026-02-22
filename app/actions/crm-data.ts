"use server"

import { createClient } from "@/lib/supabase/server"
import { getOrCreateProfile } from "@/lib/db/profiles"
import { fetchFlows, fetchStages } from "@/lib/db/flows"
import { fetchClients } from "@/lib/db/clients"
import { fetchLeads } from "@/lib/db/leads"
import { fetchActivities } from "@/lib/db/activities"
import { fetchTasks } from "@/lib/db/tasks"
import { fetchCustomSources } from "@/lib/db/agent-custom-sources"
import type { Flow, Stage, Client, Lead, Activity, Task } from "@/lib/types"

export interface HydratePayload {
  flows: Flow[]
  stages: Stage[]
  clients: Client[]
  leads: Lead[]
  activities: Activity[]
  tasks: Task[]
  agentCustomSources: Record<string, string[]>
  displayName: string
  /** Saved profile theme: light | dark | system. Applied on sign-in. */
  theme: "light" | "dark" | "system"
}

export async function fetchCRMData(): Promise<HydratePayload | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const agentId = user.id
  const profile = await getOrCreateProfile(
    agentId,
    (user.user_metadata?.full_name as string) ?? user.email ?? undefined
  )
  const displayName =
    profile?.display_name?.trim() || (user.user_metadata?.full_name as string)?.trim() || user.email || "Agent"
  const themeRaw = (profile as { theme?: string } | null)?.theme?.trim()
  const theme: "light" | "dark" | "system" =
    themeRaw === "dark" || themeRaw === "system" ? themeRaw : "light"

  const [flows, stages, clients, leads, activities, tasks, customSources] = await Promise.all([
    fetchFlows(agentId),
    fetchStages(agentId),
    fetchClients(agentId),
    fetchLeads(agentId),
    fetchActivities(agentId),
    fetchTasks(agentId),
    fetchCustomSources(agentId),
  ])

  return {
    flows,
    stages,
    clients,
    leads,
    activities,
    tasks,
    agentCustomSources: { [displayName]: customSources },
    displayName,
    theme,
  }
}
