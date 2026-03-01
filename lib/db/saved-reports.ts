import type { ReportFilterField } from "@/lib/report-filters"

/** Stored filter shape (no id/label - derived at runtime). */
export interface SavedReportFilter {
  field: ReportFilterField
  value: string
  valueTo?: string
  policyDateFrom?: string
  policyDateTo?: string
}

export interface SavedReport {
  id: string
  agent_id: string
  name: string
  filters: SavedReportFilter[]
  created_at: string
  organization_id?: string | null
}

/** Fetch saved reports. When orgId is null, returns personal/CRM reports. When orgId is set, returns agency reports for that org. */
export async function fetchSavedReports(
  agentId: string,
  orgId?: string | null
): Promise<SavedReport[]> {
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()
  let query = supabase
    .from("saved_reports")
    .select("id, agent_id, name, filters, created_at, organization_id")
    .eq("agent_id", agentId)
  if (orgId == null) {
    query = query.is("organization_id", null)
  } else {
    query = query.eq("organization_id", orgId)
  }
  const { data, error } = await query.order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    agent_id: r.agent_id,
    name: r.name,
    filters: Array.isArray(r.filters) ? r.filters : [],
    created_at: r.created_at,
    organization_id: r.organization_id ?? undefined,
  }))
}

export async function insertSavedReport(
  agentId: string,
  name: string,
  filters: SavedReportFilter[],
  organizationId?: string | null
): Promise<SavedReport> {
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()
  const insertRow: Record<string, unknown> = {
    agent_id: agentId,
    name: name.trim(),
    filters: filters,
  }
  if (organizationId != null) {
    insertRow.organization_id = organizationId
  } else {
    insertRow.organization_id = null
  }
  const { data, error } = await supabase
    .from("saved_reports")
    .insert(insertRow)
    .select("id, agent_id, name, filters, created_at, organization_id")
    .single()
  if (error) throw error
  return {
    id: data.id,
    agent_id: data.agent_id,
    name: data.name,
    filters: Array.isArray(data.filters) ? data.filters : [],
    created_at: data.created_at,
    organization_id: data.organization_id ?? undefined,
  }
}

export async function deleteSavedReport(
  agentId: string,
  reportId: string
): Promise<void> {
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()
  // RLS ensures user can only delete their own reports (personal or org-scoped they have access to)
  const { error } = await supabase
    .from("saved_reports")
    .delete()
    .eq("id", reportId)
    .eq("agent_id", agentId)
  if (error) throw error
}
