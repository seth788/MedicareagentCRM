import { useSyncExternalStore, useCallback } from "react"
import type { Lead, Client, Activity, Task, Flow, Stage } from "./types"
import { getPreferredOrFirstPhone, getPreferredOrFirstEmail } from "./utils"
import {
  mockLeads,
  mockClients,
  mockActivities,
  mockTasks,
  agents,
  defaultFlow,
  defaultStages,
} from "./mock-data"

interface CRMState {
  leads: Lead[]
  clients: Client[]
  activities: Activity[]
  tasks: Task[]
  flows: Flow[]
  stages: Stage[]
  currentAgent: string
}

let state: CRMState = {
  leads: [...mockLeads],
  clients: [...mockClients],
  activities: [...mockActivities],
  tasks: [...mockTasks],
  flows: [defaultFlow],
  stages: [...defaultStages],
  currentAgent: agents[0],
}

const listeners = new Set<() => void>()

/** Unique id for a lead so the same contact can exist in multiple flows without key collisions. */
export function generateLeadId(): string {
  return `lead-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emitChange() {
  listeners.forEach((l) => l())
}

function getSnapshot() {
  return state
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCRMStore() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const updateLeadStage = useCallback((leadId: string, newStageId: string) => {
    const lead = state.leads.find((l) => l.id === leadId)
    if (!lead) return
    const stage = state.stages.find((s) => s.id === newStageId)
    if (!stage || stage.flowId !== lead.flowId) return
    state = {
      ...state,
      leads: state.leads.map((l) =>
        l.id === leadId ? { ...l, stageId: newStageId, updatedAt: new Date().toISOString() } : l
      ),
    }
    emitChange()
  }, [])

  const addLead = useCallback((lead: Lead) => {
    state = { ...state, leads: [lead, ...state.leads] }
    emitChange()
  }, [])

  const deleteLead = useCallback((leadId: string) => {
    state = { ...state, leads: state.leads.filter((l) => l.id !== leadId) }
    emitChange()
  }, [])

  const addClient = useCallback((client: Client) => {
    state = { ...state, clients: [client, ...state.clients] }
    emitChange()
  }, [])

  const updateClient = useCallback((clientId: string, updates: Partial<Client>) => {
    state = {
      ...state,
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    }
    emitChange()
  }, [])

  const addActivity = useCallback((activity: Activity) => {
    state = { ...state, activities: [activity, ...state.activities] }
    emitChange()
  }, [])

  const addTask = useCallback((task: Task) => {
    state = { ...state, tasks: [task, ...state.tasks] }
    emitChange()
  }, [])

  const completeTask = useCallback((taskId: string) => {
    const task = state.tasks.find((t) => t.id === taskId)
    const now = new Date().toISOString()
    state = {
      ...state,
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, completedAt: now } : t
      ),
      activities: task
        ? [
            {
              id: `act-${Date.now()}`,
              relatedType: task.relatedType,
              relatedId: task.relatedId,
              type: "note" as const,
              description: `Task completed: ${task.title}`,
              createdAt: now,
              createdBy: "Sarah Mitchell",
            },
            ...state.activities,
          ]
        : state.activities,
    }
    emitChange()
  }, [])

  const createLeadFromClient = useCallback(
    (clientId: string, flowId: string, stageId: string): Lead | null => {
      const client = state.clients.find((c) => c.id === clientId)
      if (!client) return null
      const stage = state.stages.find((s) => s.id === stageId && s.flowId === flowId)
      if (!stage) return null
      const phone = getPreferredOrFirstPhone(client)
      const email = getPreferredOrFirstEmail(client)
      const now = new Date().toISOString()
      const lead: Lead = {
        id: generateLeadId(),
        firstName: client.firstName,
        lastName: client.lastName,
        phone: phone?.number ?? "",
        email: email?.value ?? "",
        source: "Referral",
        flowId,
        stageId,
        notes: ["Marked as lead from client profile"],
        tags: [],
        assignedTo: state.currentAgent,
        createdAt: now,
        updatedAt: now,
        nextFollowUpAt: null,
        dob: client.dob,
        clientId,
      }
      state = { ...state, leads: [lead, ...state.leads] }
      emitChange()
      return lead
    },
    []
  )

  const getStagesByFlowId = useCallback((flowId: string): Stage[] => {
    return state.stages.filter((s) => s.flowId === flowId).sort((a, b) => a.order - b.order)
  }, [])

  const getDefaultFlow = useCallback((): Flow | undefined => {
    return state.flows.find((f) => f.isDefault) ?? state.flows[0]
  }, [])

  const getStageById = useCallback((stageId: string): Stage | undefined => {
    return state.stages.find((s) => s.id === stageId)
  }, [])

  const addFlow = useCallback((flow: Flow) => {
    state = { ...state, flows: [...state.flows, flow].sort((a, b) => a.order - b.order) }
    emitChange()
  }, [])

  const updateFlow = useCallback((id: string, updates: Partial<Omit<Flow, "id">>) => {
    if (updates.isDefault === true) {
      state = {
        ...state,
        flows: state.flows.map((f) => ({ ...f, isDefault: f.id === id })),
      }
    }
    state = {
      ...state,
      flows: state.flows.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }
    emitChange()
  }, [])

  const deleteFlow = useCallback((id: string): boolean => {
    const inUse = state.leads.some((l) => l.flowId === id)
    if (inUse) return false
    state = { ...state, flows: state.flows.filter((f) => f.id !== id), stages: state.stages.filter((s) => s.flowId !== id) }
    emitChange()
    return true
  }, [])

  const addStage = useCallback((flowId: string, stage: Omit<Stage, "id" | "flowId" | "order">) => {
    const flowStages = state.stages.filter((s) => s.flowId === flowId)
    const maxOrder = flowStages.length ? Math.max(...flowStages.map((s) => s.order)) : -1
    const newStage: Stage = {
      ...stage,
      id: `stage-${Date.now()}`,
      flowId,
      order: maxOrder + 1,
    }
    state = { ...state, stages: [...state.stages, newStage] }
    emitChange()
  }, [])

  const updateStage = useCallback((id: string, updates: Partial<Omit<Stage, "id" | "flowId">>) => {
    state = {
      ...state,
      stages: state.stages.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }
    emitChange()
  }, [])

  const deleteStage = useCallback((id: string, moveToStageId?: string): boolean => {
    const stage = state.stages.find((s) => s.id === id)
    if (!stage) return false
    const leadCount = state.leads.filter((l) => l.stageId === id).length
    if (leadCount > 0) {
      if (!moveToStageId) return false
      const target = state.stages.find((s) => s.id === moveToStageId && s.flowId === stage.flowId)
      if (!target) return false
      state = {
        ...state,
        leads: state.leads.map((l) =>
          l.stageId === id ? { ...l, stageId: moveToStageId, updatedAt: new Date().toISOString() } : l
        ),
      }
    }
    state = { ...state, stages: state.stages.filter((s) => s.id !== id) }
    emitChange()
    return true
  }, [])

  return {
    ...snap,
    updateLeadStage,
    addLead,
    deleteLead,
    addClient,
    updateClient,
    addActivity,
    addTask,
    completeTask,
    createLeadFromClient,
    getStagesByFlowId,
    getDefaultFlow,
    getStageById,
    addFlow,
    updateFlow,
    deleteFlow,
    addStage,
    updateStage,
    deleteStage,
  }
}
