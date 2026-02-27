"use server"

import { createClient } from "@/lib/supabase/server"
import { getOrCreateProfile } from "@/lib/db/profiles"
import { getUserDashboardOrgs, getUserAgencyBookOrgs } from "@/lib/db/organizations"
import { fetchFlows, fetchStages } from "@/lib/db/flows"
import { getFlowTemplates } from "@/lib/db/flow-templates"
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
  /** Agent email from auth. */
  email: string
  /** Agent profile picture URL. */
  avatarUrl: string | null
  /** Saved profile theme: light | dark | system. Applied on sign-in. */
  theme: "light" | "dark" | "system"
  /** When true, pending policies with past effective dates are auto-issued on add/edit. */
  autoIssueApplications: boolean
  /** Orgs the user has dashboard access to (for Agency nav). */
  dashboardOrgs: { id: string; name: string }[]
  /** Orgs where user can view agency book (community agents). */
  agencyBookOrgs: { id: string; name: string }[]
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
  const autoIssueApplications =
    (profile as { auto_issue_applications?: boolean } | null)?.auto_issue_applications ?? true
  const avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url?.trim() || null

  const [flows, stages, clients, leads, activities, tasks, customSources, dashboardOrgs, agencyBookOrgs] = await Promise.all([
    fetchFlows(agentId),
    fetchStages(agentId),
    fetchClients(agentId),
    fetchLeads(agentId),
    fetchActivities(agentId),
    fetchTasks(agentId),
    fetchCustomSources(agentId),
    getUserDashboardOrgs(agentId),
    getUserAgencyBookOrgs(agentId),
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
    email: user.email ?? "",
    avatarUrl,
    theme,
    autoIssueApplications,
    dashboardOrgs: dashboardOrgs ?? [],
    agencyBookOrgs: agencyBookOrgs ?? [],
  }
}

export async function fetchFlowTemplates(): Promise<Awaited<ReturnType<typeof getFlowTemplates>> | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    return await getFlowTemplates()
  } catch {
    return null
  }
}
