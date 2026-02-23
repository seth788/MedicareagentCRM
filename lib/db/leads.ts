import type { Lead } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"
import { getDisplayName } from "./profiles"

export async function fetchLeads(agentId: string): Promise<Lead[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leads")
    .select("id, first_name, last_name, phone, email, source, flow_id, stage_id, notes, tags, assigned_to_agent_id, created_at, updated_at, last_touched_at, next_follow_up_at, dob, client_id")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
  if (error) throw error
  if (!data?.length) return []

  const agentIds = [...new Set(data.map((r) => r.assigned_to_agent_id).filter(Boolean))]
  const names: Record<string, string> = {}
  await Promise.all(
    agentIds.map(async (id) => {
      names[id] = await getDisplayName(supabase, id)
    })
  )

  return data.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone ?? "",
    email: r.email ?? "",
    source: r.source,
    flowId: r.flow_id,
    stageId: r.stage_id,
    notes: (r.notes as Lead["notes"]) ?? [],
    tags: r.tags ?? [],
    assignedTo: names[r.assigned_to_agent_id] ?? r.assigned_to_agent_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastTouchedAt: r.last_touched_at ?? undefined,
    nextFollowUpAt: r.next_follow_up_at,
    dob: r.dob ?? undefined,
    clientId: r.client_id ?? undefined,
  }))
}

export async function insertLead(agentId: string, lead: Lead): Promise<Lead> {
  const supabase = await createClient()
  const { error } = await supabase.from("leads").insert({
    id: lead.id,
    agent_id: agentId,
    assigned_to_agent_id: agentId,
    client_id: lead.clientId ?? null,
    flow_id: lead.flowId,
    stage_id: lead.stageId,
    first_name: lead.firstName,
    last_name: lead.lastName,
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    source: lead.source,
    notes: lead.notes ?? [],
    tags: lead.tags ?? [],
    next_follow_up_at: lead.nextFollowUpAt ?? null,
    dob: lead.dob ?? null,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  })
  if (error) throw error
  return lead
}

export async function updateLead(
  agentId: string,
  leadId: string,
  updates: Partial<Lead>
): Promise<void> {
  const supabase = await createClient()
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.firstName !== undefined) row.first_name = updates.firstName
  if (updates.lastName !== undefined) row.last_name = updates.lastName
  if (updates.phone !== undefined) row.phone = updates.phone
  if (updates.email !== undefined) row.email = updates.email
  if (updates.source !== undefined) row.source = updates.source
  if (updates.flowId !== undefined) row.flow_id = updates.flowId
  if (updates.stageId !== undefined) row.stage_id = updates.stageId
  if (updates.notes !== undefined) row.notes = updates.notes
  if (updates.tags !== undefined) row.tags = updates.tags
  if (updates.nextFollowUpAt !== undefined) row.next_follow_up_at = updates.nextFollowUpAt
  if (updates.dob !== undefined) row.dob = updates.dob
  if (updates.clientId !== undefined) row.client_id = updates.clientId
  const { error } = await supabase.from("leads").update(row).eq("id", leadId).eq("agent_id", agentId)
  if (error) throw error
}

export async function updateLeadStage(
  agentId: string,
  leadId: string,
  stageId: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("leads")
    .update({ stage_id: stageId, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("agent_id", agentId)
  if (error) throw error
}

export async function deleteLead(agentId: string, leadId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from("leads").delete().eq("id", leadId).eq("agent_id", agentId)
  if (error) throw error
}
