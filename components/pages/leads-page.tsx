"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Kanban, TableIcon, Search, Settings2, UserPlus } from "@/components/icons"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { KanbanView } from "@/components/leads/kanban-view"
import { TableView } from "@/components/leads/table-view"
import { FlowStageManager } from "@/components/leads/flow-stage-manager"
import { AddContactsToFlowDialog } from "@/components/leads/add-contacts-to-flow-dialog"
import { useCRMStore } from "@/lib/store"
import type { LeadSource } from "@/lib/types"

const sources: LeadSource[] = ["Facebook", "Referral", "Website", "Call-in", "Direct Mail", "Event"]

export default function LeadsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [view, setView] = useState<"kanban" | "table">("kanban")
  const [manageOpen, setManageOpen] = useState(false)
  const [addContactsOpen, setAddContactsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")

  const {
    leads,
    flows,
    currentAgent,
    getStagesByFlowId,
    getDefaultFlow,
  } = useCRMStore()

  const flowIdFromUrl = searchParams.get("flow")
  const defaultFlow = getDefaultFlow()
  const activeFlowId = flowIdFromUrl && flows.some((f) => f.id === flowIdFromUrl)
    ? flowIdFromUrl
    : defaultFlow?.id ?? flows[0]?.id ?? null

  const activeFlow = flows.find((f) => f.id === activeFlowId)
  const activeStages = activeFlowId ? getStagesByFlowId(activeFlowId) : []
  const leadsInFlow = useMemo(
    () => leads.filter((l) => l.flowId === activeFlowId && l.assignedTo === currentAgent),
    [leads, activeFlowId, currentAgent]
  )

  const filtered = useMemo(() => {
    return leadsInFlow.filter((l) => {
      if (search) {
        const q = search.toLowerCase()
        const match =
          l.firstName.toLowerCase().includes(q) ||
          l.lastName.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.includes(q)
        if (!match) return false
      }
      if (stageFilter !== "all" && l.stageId !== stageFilter) return false
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false
      return true
    })
  }, [leadsInFlow, search, stageFilter, sourceFilter])

  useEffect(() => {
    if (activeFlowId && flowIdFromUrl !== activeFlowId) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("flow", activeFlowId)
      router.replace(`/flows?${params.toString()}`, { scroll: false })
    }
  }, [activeFlowId, flowIdFromUrl, router, searchParams])

  const openCmd = () => {
    const fn = (window as unknown as Record<string, unknown>).__openCommandPalette
    if (typeof fn === "function") (fn as () => void)()
  }

  const setActiveFlowId = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("flow", id)
    router.push(`/flows?${params.toString()}`, { scroll: false })
  }

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader title="Flows" onOpenCommandPalette={openCmd}>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              Manage flows &amp; stages
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddContactsOpen(true)}
              disabled={!activeFlowId || activeStages.length === 0}
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Add contacts
            </Button>
          </div>
        </AppHeader>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card px-6 py-3">
          {flows.length > 0 && (
            <Select value={activeFlowId ?? ""} onValueChange={setActiveFlowId}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Select flow" />
              </SelectTrigger>
              <SelectContent>
                {flows.sort((a, b) => a.order - b.order).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="h-8 pl-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {activeStages.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1 rounded-lg border p-0.5">
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setView("kanban")}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span className="sr-only">Kanban view</span>
            </Button>
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setView("table")}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span className="sr-only">Table view</span>
            </Button>
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          {activeFlowId && activeStages.length > 0 ? (
            view === "kanban" ? (
              <KanbanView leads={filtered} stages={activeStages} />
            ) : (
              <TableView leads={filtered} stages={activeStages} />
            )
          ) : flows.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Kanban className="h-10 w-10" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="text-lg font-semibold text-foreground">No flows yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first flow to organize leads through stages—from first contact to converted client.
                </p>
              </div>
              <Button onClick={() => setManageOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Create your first flow
              </Button>
            </div>
          ) : !activeFlowId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Kanban className="h-10 w-10" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="text-lg font-semibold text-foreground">Select a flow</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a flow from the dropdown above, or open Manage flows to create or edit flows and stages.
                </p>
              </div>
              <Button variant="outline" onClick={() => setManageOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Manage flows &amp; stages
              </Button>
            </div>
          ) : activeStages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Settings2 className="h-10 w-10" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="text-lg font-semibold text-foreground">Add stages to this flow</h3>
                <p className="text-sm text-muted-foreground">
                  &quot;{activeFlow?.name}&quot; has no stages yet. Add stages like New, Contacted, and Converted to move leads through your pipeline.
                </p>
              </div>
              <Button onClick={() => setManageOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Manage flows &amp; stages
              </Button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <UserPlus className="h-10 w-10" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="text-lg font-semibold text-foreground">No leads in this flow</h3>
                <p className="text-sm text-muted-foreground">
                  Add contacts from your clients or create new leads to start moving them through &quot;{activeFlow?.name}&quot;.
                </p>
              </div>
              <Button onClick={() => setAddContactsOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add contacts
              </Button>
            </div>
          )}
        </div>
      </div>

      <FlowStageManager open={manageOpen} onOpenChange={setManageOpen} />
      {activeFlowId && activeFlow && (
        <AddContactsToFlowDialog
          open={addContactsOpen}
          onOpenChange={setAddContactsOpen}
          flowId={activeFlowId}
          flowName={activeFlow.name}
          stages={activeStages}
        />
      )}
    </>
  )
}
