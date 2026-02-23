import { useSyncExternalStore, useCallback } from "react"
import type { Lead, Client, Activity, Task, Flow, Stage } from "./types"
import type { LeadSource } from "./types"
import { getPreferredOrFirstPhone, getPreferredOrFirstEmail } from "./utils"
import type { HydratePayload } from "@/app/actions/crm-data"

interface CRMState {
  leads: Lead[]
  clients: Client[]
  activities: Activity[]
  tasks: Task[]
  flows: Flow[]
  stages: Stage[]
  currentAgent: string
  /** Custom source options per agent (agent name -> list of source labels). */
  agentCustomSources: Record<string, string[]>
  /** True after first hydrate attempt (success or fail). */
  hydrated: boolean
}

let state: CRMState = {
  leads: [],
  clients: [],
  activities: [],
  tasks: [],
  flows: [],
  stages: [],
  currentAgent: "",
  agentCustomSources: {},
  hydrated: false,
}

/** Hydrate store from Supabase (called after auth). */
export function hydrateCRM(payload: HydratePayload) {
  state = {
    ...state,
    flows: payload.flows,
    stages: payload.stages,
    clients: payload.clients,
    leads: payload.leads,
    activities: payload.activities,
    tasks: payload.tasks,
    agentCustomSources: payload.agentCustomSources,
    currentAgent: payload.displayName,
    hydrated: true,
  }
  emitChange()
}

/** Refetch callback type (fetchCRMData + hydrate). Set by CrmDataLoader for pages to trigger refetch. */
export type RefetchCRM = () => Promise<void>
let refetchCRM: RefetchCRM | null = null
export function setRefetchCRM(fn: RefetchCRM | null) {
  refetchCRM = fn
}
export function getRefetchCRM(): RefetchCRM | null {
  return refetchCRM
}

export function setHydrated() {
  state = { ...state, hydrated: true }
  emitChange()
}

const listeners = new Set<() => void>()

export type PersistHandlers = {
  addLead?: (lead: Lead) => void
  updateLead?: (leadId: string, updates: Partial<Lead>) => void
  updateLeadStage?: (leadId: string, stageId: string) => void
  deleteLead?: (leadId: string) => void
  addClient?: (client: Client) => void
  updateClient?: (clientId: string, updates: Partial<Client>) => void
  addActivity?: (activity: Activity) => void
  addTask?: (task: Task) => void
  completeTask?: (taskId: string) => void
  addFlow?: (flow: Flow) => void
  updateFlow?: (id: string, updates: Partial<Omit<Flow, "id">>) => void
  deleteFlow?: (id: string) => void
  addStage?: (flowId: string, stage: Omit<Stage, "id" | "flowId"> & { id: string; order: number }) => void
  updateStage?: (id: string, updates: Partial<Omit<Stage, "id" | "flowId">>) => void
  deleteStage?: (stageId: string, moveToStageId?: string) => void
  addAgentCustomSource?: (agentKey: string, source: string) => void
}

let persistHandlers: PersistHandlers = {}

export function setPersistHandlers(handlers: PersistHandlers) {
  persistHandlers = handlers
}

/** UUID for new leads (DB primary key). */
export function generateLeadId(): string {
  return crypto.randomUUID()
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
    const now = new Date().toISOString()
    state = {
      ...state,
      leads: state.leads.map((l) =>
        l.id === leadId
          ? { ...l, stageId: newStageId, updatedAt: now, lastTouchedAt: now }
          : l
      ),
    }
    emitChange()
    persistHandlers.updateLeadStage?.(leadId, newStageId)
  }, [])

  const addLead = useCallback((lead: Lead) => {
    state = { ...state, leads: [lead, ...state.leads] }
    emitChange()
    persistHandlers.addLead?.(lead)
  }, [])

  const updateLead = useCallback((leadId: string, updates: Partial<Lead>) => {
    state = {
      ...state,
      leads: state.leads.map((l) =>
        l.id === leadId
          ? { ...l, ...updates, updatedAt: new Date().toISOString() }
          : l
      ),
    }
    emitChange()
    persistHandlers.updateLead?.(leadId, updates)
  }, [])

  const deleteLead = useCallback((leadId: string) => {
    state = { ...state, leads: state.leads.filter((l) => l.id !== leadId) }
    emitChange()
    persistHandlers.deleteLead?.(leadId)
  }, [])

  const addClient = useCallback((client: Client) => {
    state = { ...state, clients: [client, ...state.clients] }
    emitChange()
    persistHandlers.addClient?.(client)
  }, [])

  const updateClient = useCallback((clientId: string, updates: Partial<Client>) => {
    state = {
      ...state,
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    }
    emitChange()
    persistHandlers.updateClient?.(clientId, updates)
  }, [])

  const addAgentCustomSource = useCallback((agentId: string, source: string) => {
    const trimmed = source.trim()
    if (!trimmed) return
    const existing = state.agentCustomSources[agentId] ?? []
    if (existing.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return
    state = {
      ...state,
      agentCustomSources: {
        ...state.agentCustomSources,
        [agentId]: [...existing, trimmed],
      },
    }
    emitChange()
    persistHandlers.addAgentCustomSource?.(agentId, trimmed)
  }, [])

  const addActivity = useCallback((activity: Activity) => {
    state = { ...state, activities: [activity, ...state.activities] }
    emitChange()
    persistHandlers.addActivity?.(activity)
  }, [])

  const addTask = useCallback((task: Task) => {
    state = { ...state, tasks: [task, ...state.tasks] }
    emitChange()
    persistHandlers.addTask?.(task)
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
              id: crypto.randomUUID(),
              relatedType: task.relatedType,
              relatedId: task.relatedId,
              type: "note" as const,
              description: `Task completed: ${task.title}`,
              createdAt: now,
              createdBy: state.currentAgent,
            },
            ...state.activities,
          ]
        : state.activities,
    }
    emitChange()
    persistHandlers.completeTask?.(taskId)
  }, [])

const VALID_LEAD_SOURCES: LeadSource[] = ["Facebook", "Referral", "Website", "Call-in", "Direct Mail", "Event"]

  const createLeadFromClient = useCallback(
    (clientId: string, flowId: string, stageId: string): Lead | null => {
      const client = state.clients.find((c) => c.id === clientId)
      if (!client) return null
      const alreadyInThisFlow = state.leads.some(
        (l) => l.clientId === clientId && l.flowId === flowId
      )
      if (alreadyInThisFlow) return null
      const stage = state.stages.find((s) => s.id === stageId && s.flowId === flowId)
      if (!stage) return null
      const phone = getPreferredOrFirstPhone(client)
      const email = getPreferredOrFirstEmail(client)
      const now = new Date().toISOString()
      const source: LeadSource =
        client.source && VALID_LEAD_SOURCES.includes(client.source as LeadSource)
          ? (client.source as LeadSource)
          : "Referral"
      const lead: Lead = {
        id: crypto.randomUUID(),
        firstName: client.firstName,
        lastName: client.lastName,
        phone: phone?.number ?? "",
        email: email?.value ?? "",
        source,
        flowId,
        stageId,
        notes: [{ text: "Marked as lead from client profile", createdAt: now }],
        tags: [],
        assignedTo: state.currentAgent,
        createdAt: now,
        updatedAt: now,
        lastTouchedAt: now,
        nextFollowUpAt: null,
        dob: client.dob,
        clientId,
      }
      state = { ...state, leads: [lead, ...state.leads] }
      emitChange()
      persistHandlers.addLead?.(lead)
      return lead
    },
    []
  )

  const getStagesByFlowId = useCallback((flowId: string): Stage[] => {
    return state.stages.filter((s) => s.flowId === flowId).sort((a, b) => a.order - b.order)
  }, [])

  const getDefaultFlow = useCallback((): Flow | undefined => {
    const defaultFlow = state.flows.find((f) => f.isDefault)
    return defaultFlow ?? state.flows[0] ?? undefined
  }, [])

  const getStageById = useCallback((stageId: string): Stage | undefined => {
    return state.stages.find((s) => s.id === stageId)
  }, [])

  const addFlow = useCallback((flow: Flow) => {
    state = { ...state, flows: [...state.flows, flow].sort((a, b) => a.order - b.order) }
    emitChange()
    persistHandlers.addFlow?.(flow)
  }, [])

  const updateFlow = useCallback((id: string, updates: Partial<Omit<Flow, "id">>) => {
    if (updates.isDefault === true) {
      state = {
        ...state,
        flows: state.flows.map((f) =>
          f.id === id ? { ...f, ...updates } : { ...f, isDefault: false }
        ),
      }
      emitChange()
      persistHandlers.updateFlow?.(id, updates)
      return
    }
    state = {
      ...state,
      flows: state.flows.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }
    emitChange()
    persistHandlers.updateFlow?.(id, updates)
  }, [])

  const deleteFlow = useCallback((id: string): boolean => {
    const inUse = state.leads.some((l) => l.flowId === id)
    if (inUse) return false
    state = { ...state, flows: state.flows.filter((f) => f.id !== id), stages: state.stages.filter((s) => s.flowId !== id) }
    emitChange()
    persistHandlers.deleteFlow?.(id)
    return true
  }, [])

  const addStage = useCallback((flowId: string, stage: Omit<Stage, "id" | "flowId" | "order">) => {
    const flowStages = state.stages.filter((s) => s.flowId === flowId)
    const maxOrder = flowStages.length ? Math.max(...flowStages.map((s) => s.order)) : -1
    const newStage: Stage = {
      ...stage,
      id: crypto.randomUUID(),
      flowId,
      order: maxOrder + 1,
    }
    state = { ...state, stages: [...state.stages, newStage] }
    emitChange()
    persistHandlers.addStage?.(flowId, { ...newStage, id: newStage.id, order: newStage.order })
  }, [])

  const updateStage = useCallback((id: string, updates: Partial<Omit<Stage, "id" | "flowId">>) => {
    state = {
      ...state,
      stages: state.stages.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }
    emitChange()
    persistHandlers.updateStage?.(id, updates)
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
    persistHandlers.deleteStage?.(id, moveToStageId)
    return true
  }, [])

  const setCurrentAgent = useCallback((name: string) => {
    state = { ...state, currentAgent: name }
    emitChange()
  }, [])

  return {
    ...snap,
    setCurrentAgent,
    updateLeadStage,
    updateLead,
    addLead,
    deleteLead,
    addClient,
    updateClient,
    addAgentCustomSource,
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
    setCurrentAgent,
  }
}
