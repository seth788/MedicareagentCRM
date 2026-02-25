import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export interface PendingIssuedRow {
  coverageId: string
  clientId: string
  clientName: string
  planType: string
  carrier: string
  planName: string
  effectiveDate: string
  writtenAs: string
  status: string
  commissionStatus: string | null
}

const PENDING_STATUSES = ["Pending/Submitted", "Pending (not agent of record)"]
const ISSUED_STATUSES = ["Active", "Active (not agent of record)"]
const ALL_STATUSES = [...PENDING_STATUSES, ...ISSUED_STATUSES]

export async function fetchCoveragesForPendingPage(
  agentId: string
): Promise<PendingIssuedRow[]> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from("client_coverages")
    .select(
      "id, client_id, plan_type, carrier, plan_name, effective_date, written_as, status, commission_status, clients!inner(first_name, last_name)"
    )
    .in("status", ALL_STATUSES)
    .eq("clients.agent_id", agentId)
    .order("effective_date", { ascending: false })

  if (error) throw error
  if (!rows?.length) return []

  return rows.map((r: Record<string, unknown>) => {
    const client = r.clients as { first_name: string; last_name: string }
    return {
      coverageId: r.id as string,
      clientId: r.client_id as string,
      clientName: `${client.last_name}, ${client.first_name}`,
      planType: r.plan_type as string,
      carrier: r.carrier as string,
      planName: r.plan_name as string,
      effectiveDate: r.effective_date as string,
      writtenAs: (r.written_as as string) ?? "",
      status: r.status as string,
      commissionStatus: r.commission_status as string | null,
    }
  })
}

export async function updateCoverageCommissionStatus(
  coverageId: string,
  commissionStatus: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("client_coverages")
    .update({ commission_status: commissionStatus, updated_at: new Date().toISOString() })
    .eq("id", coverageId)
  if (error) throw error
}

export async function markCoverageIssued(
  coverageId: string,
  commissionStatus: string,
  currentStatus: string
): Promise<void> {
  const supabase = await createClient()
  const newStatus =
    currentStatus === "Pending (not agent of record)"
      ? "Active (not agent of record)"
      : "Active"
  const { error } = await supabase
    .from("client_coverages")
    .update({
      status: newStatus,
      commission_status: commissionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", coverageId)
  if (error) throw error
}

/**
 * Run auto-issue for pending coverages whose effective date has passed.
 * Only processes coverages for agents with auto_issue_applications = true.
 * Uses the provided Supabase client (typically service role for cron).
 */
export async function runAutoIssueCron(
  supabase: SupabaseClient
): Promise<{ processed: number; errors: string[] }> {
  const today = new Date().toISOString().slice(0, 10)

  const { data: agentRows, error: agentError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auto_issue_applications", true)

  if (agentError) throw agentError
  const agentIds = (agentRows ?? []).map((r) => r.id as string)
  if (agentIds.length === 0) return { processed: 0, errors: [] }

  const agentIdSet = new Set(agentIds)
  const { data: coverages, error: covError } = await supabase
    .from("client_coverages")
    .select("id, status, clients!inner(agent_id)")
    .in("status", PENDING_STATUSES)
    .lte("effective_date", today)

  if (covError) throw covError
  const rows = (coverages ?? [])
    .filter((r) => agentIdSet.has((r.clients as { agent_id: string }).agent_id))
    .map((r) => ({ id: r.id, status: r.status }))

  const errors: string[] = []
  for (const row of rows) {
    const newStatus =
      row.status === "Pending (not agent of record)"
        ? "Active (not agent of record)"
        : "Active"
    const { error } = await supabase
      .from("client_coverages")
      .update({
        status: newStatus,
        commission_status: "paid_full",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
    if (error) errors.push(`${row.id}: ${error.message}`)
  }
  return { processed: rows.length - errors.length, errors }
}
