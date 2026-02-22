"use server"

import { createClient } from "@/lib/supabase/server"
import * as flowsDb from "@/lib/db/flows"
import * as clientsDb from "@/lib/db/clients"
import * as leadsDb from "@/lib/db/leads"
import * as activitiesDb from "@/lib/db/activities"
import * as tasksDb from "@/lib/db/tasks"
import * as agentSourcesDb from "@/lib/db/agent-custom-sources"
import type { Lead, Client, Activity, Task, Flow, Stage } from "@/lib/types"

async function getAgentId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return user.id
}

export async function persistAddLead(lead: Lead): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await leadsDb.insertLead(agentId, lead)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add lead" }
  }
}

export async function persistUpdateLead(
  leadId: string,
  updates: Partial<Lead>
): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await leadsDb.updateLead(agentId, leadId, updates)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update lead" }
  }
}

export async function persistUpdateLeadStage(
  leadId: string,
  stageId: string
): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await leadsDb.updateLeadStage(agentId, leadId, stageId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update lead stage" }
  }
}

export async function persistDeleteLead(leadId: string): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await leadsDb.deleteLead(agentId, leadId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete lead" }
  }
}

export async function persistAddClient(client: Client): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await clientsDb.insertClient(agentId, client)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add client" }
  }
}

export async function persistUpdateClient(
  clientId: string,
  updates: Partial<Client>
): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await clientsDb.updateClient(agentId, clientId, updates)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update client" }
  }
}

export async function persistAddActivity(activity: Activity): Promise<{ error?: string; id?: string }> {
  try {
    const agentId = await getAgentId()
    const created = await activitiesDb.insertActivity(agentId, activity)
    return { id: created.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add activity" }
  }
}

export async function persistAddTask(task: Task): Promise<{ error?: string; id?: string }> {
  try {
    const agentId = await getAgentId()
    const created = await tasksDb.insertTask(agentId, task)
    return { id: created.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add task" }
  }
}

export async function persistCompleteTask(taskId: string): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await tasksDb.completeTask(agentId, taskId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to complete task" }
  }
}

export async function persistAddFlow(flow: Flow): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await flowsDb.addFlow(agentId, flow)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add flow" }
  }
}

export async function persistUpdateFlow(
  id: string,
  updates: Partial<Omit<Flow, "id">>
): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await flowsDb.updateFlow(agentId, id, updates)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update flow" }
  }
}

export async function persistDeleteFlow(id: string): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await flowsDb.deleteFlow(agentId, id)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete flow" }
  }
}

export async function persistAddStage(
  flowId: string,
  stage: Omit<Stage, "id" | "flowId"> & { id: string; order: number }
): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await flowsDb.addStage(agentId, flowId, stage)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add stage" }
  }
}

export async function persistUpdateStage(
  id: string,
  updates: Partial<Omit<Stage, "id" | "flowId">>
): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await flowsDb.updateStage(agentId, id, updates)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update stage" }
  }
}

export async function persistDeleteStage(
  stageId: string,
  moveToStageId?: string
): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    if (moveToStageId) {
      const { data: leads } = await (await createClient())
        .from("leads")
        .select("id")
        .eq("stage_id", stageId)
      for (const l of leads ?? []) {
        await leadsDb.updateLeadStage(agentId, l.id, moveToStageId)
      }
    }
    await flowsDb.deleteStage(agentId, stageId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete stage" }
  }
}

export async function persistAddAgentCustomSource(
  agentKey: string,
  source: string
): Promise<{ error?: string }> {
  try {
    const agentId = await getAgentId()
    await agentSourcesDb.addCustomSource(agentId, source)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add source" }
  }
}
