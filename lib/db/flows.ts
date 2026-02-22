import type { Flow, Stage } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"

export async function fetchFlows(agentId: string): Promise<Flow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("flows")
    .select("id, name, order, is_default, created_at")
    .eq("agent_id", agentId)
    .order("order", { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    order: r.order,
    isDefault: r.is_default,
    createdAt: r.created_at,
  }))
}

export async function fetchStages(agentId: string): Promise<Stage[]> {
  const supabase = await createClient()
  const { data: flows } = await supabase
    .from("flows")
    .select("id")
    .eq("agent_id", agentId)
  const flowIds = (flows ?? []).map((f) => f.id)
  if (flowIds.length === 0) return []
  const { data, error } = await supabase
    .from("stages")
    .select("id, flow_id, name, order, color_key")
    .in("flow_id", flowIds)
    .order("order", { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    flowId: r.flow_id,
    name: r.name,
    order: r.order,
    colorKey: r.color_key ?? undefined,
  }))
}

export async function addFlow(
  agentId: string,
  flow: { id: string; name: string; order: number; isDefault: boolean }
): Promise<Flow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("flows")
    .insert({
      id: flow.id,
      agent_id: agentId,
      name: flow.name,
      order: flow.order,
      is_default: false,
    })
    .select("id, name, order, is_default, created_at")
    .single()
  if (error) throw error
  return {
    id: data.id,
    name: data.name,
    order: data.order,
    isDefault: data.is_default,
    createdAt: data.created_at,
  }
}

export async function updateFlow(
  agentId: string,
  id: string,
  updates: { name?: string; order?: number; isDefault?: boolean }
): Promise<void> {
  const supabase = await createClient()
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.order !== undefined) payload.order = updates.order
  if (Object.keys(payload).length === 0) return
  const { error } = await supabase.from("flows").update(payload).eq("id", id).eq("agent_id", agentId)
  if (error) throw error
}

export async function deleteFlow(agentId: string, id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from("flows").delete().eq("id", id).eq("agent_id", agentId)
  if (error) throw error
  return true
}

export async function addStage(
  agentId: string,
  flowId: string,
  stage: { id: string; name: string; colorKey?: string; order: number }
): Promise<Stage> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("stages")
    .insert({
      id: stage.id,
      flow_id: flowId,
      name: stage.name,
      order: stage.order,
      color_key: stage.colorKey ?? null,
    })
    .select("id, flow_id, name, order, color_key")
    .single()
  if (error) throw error
  return {
    id: data.id,
    flowId: data.flow_id,
    name: data.name,
    order: data.order,
    colorKey: data.color_key ?? undefined,
  }
}

export async function updateStage(
  agentId: string,
  id: string,
  updates: { name?: string; order?: number; colorKey?: string }
): Promise<void> {
  const supabase = await createClient()
  const { data: flows } = await supabase.from("flows").select("id").eq("agent_id", agentId)
  const flowIds = (flows ?? []).map((f) => f.id)
  if (flowIds.length === 0) return
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.order !== undefined) payload.order = updates.order
  if (updates.colorKey !== undefined) payload.color_key = updates.colorKey
  if (Object.keys(payload).length === 0) return
  const { error } = await supabase
    .from("stages")
    .update(payload)
    .eq("id", id)
    .in("flow_id", flowIds)
  if (error) throw error
}

export async function deleteStage(agentId: string, stageId: string): Promise<void> {
  const supabase = await createClient()
  const { data: flows } = await supabase.from("flows").select("id").eq("agent_id", agentId)
  const flowIds = (flows ?? []).map((f) => f.id)
  if (flowIds.length === 0) return
  const { error } = await supabase
    .from("stages")
    .delete()
    .eq("id", stageId)
    .in("flow_id", flowIds)
  if (error) throw error
}
