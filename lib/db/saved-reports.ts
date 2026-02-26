import type { ReportFilterField } from "@/lib/report-filters"

/** Stored filter shape (no id/label - derived at runtime). */
export interface SavedReportFilter {
  field: ReportFilterField
  value: string
  valueTo?: string
}

export interface SavedReport {
  id: string
  agent_id: string
  name: string
  filters: SavedReportFilter[]
  created_at: string
}

export async function fetchSavedReports(agentId: string): Promise<SavedReport[]> {
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("saved_reports")
    .select("id, agent_id, name, filters, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    agent_id: r.agent_id,
    name: r.name,
    filters: Array.isArray(r.filters) ? r.filters : [],
    created_at: r.created_at,
  }))
}

export async function insertSavedReport(
  agentId: string,
  name: string,
  filters: SavedReportFilter[]
): Promise<SavedReport> {
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("saved_reports")
    .insert({
      agent_id: agentId,
      name: name.trim(),
      filters: filters,
    })
    .select("id, agent_id, name, filters, created_at")
    .single()
  if (error) throw error
  return {
    id: data.id,
    agent_id: data.agent_id,
    name: data.name,
    filters: Array.isArray(data.filters) ? data.filters : [],
    created_at: data.created_at,
  }
}

export async function deleteSavedReport(
  agentId: string,
  reportId: string
): Promise<void> {
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()
  const { error } = await supabase
    .from("saved_reports")
    .delete()
    .eq("id", reportId)
    .eq("agent_id", agentId)
  if (error) throw error
}
