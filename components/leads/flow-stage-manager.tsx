"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Star, MoreVertical } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"
import type { Flow, Stage } from "@/lib/types"
import { DeleteStageDialog } from "./delete-stage-dialog"

const STAGE_COLOR_PRESETS = [
  "#22C55E",
  "#3B82F6",
  "#A855F7",
  "#06B6D4",
  "#374151",
  "#EF4444",
  "#EAB308",
  "#EC4899",
]

function isHexColor(value: string | undefined): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)
}

interface FlowStageManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FlowStageManager({ open, onOpenChange }: FlowStageManagerProps) {
  const {
    flows,
    stages,
    leads,
    addFlow,
    updateFlow,
    deleteFlow,
    addStage,
    updateStage,
    deleteStage,
    getStagesByFlowId,
  } = useCRMStore()

  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null)
  const [editingFlowName, setEditingFlowName] = useState("")
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editingStageName, setEditingStageName] = useState("")
  const [newFlowName, setNewFlowName] = useState("")
  const [newStageName, setNewStageName] = useState("")
  const [deleteStageState, setDeleteStageState] = useState<{
    stageId: string
    stageName: string
    leadCount: number
    flowId: string
  } | null>(null)

  const selectedFlow = flows.find((f) => f.id === selectedFlowId)
  const flowStages = selectedFlowId ? getStagesByFlowId(selectedFlowId) : []

  useEffect(() => {
    if (open && flows.length > 0 && !selectedFlowId) {
      setSelectedFlowId(flows[0].id)
    }
  }, [open, flows, selectedFlowId])

  const handleAddFlow = () => {
    const name = newFlowName.trim() || "New flow"
    const maxOrder = flows.length ? Math.max(...flows.map((f) => f.order)) : -1
    addFlow({
      id: `flow-${Date.now()}`,
      name,
      order: maxOrder + 1,
      isDefault: flows.length === 0,
      createdAt: new Date().toISOString(),
    })
    setNewFlowName("")
    goeyToast.success(name)
  }

  const handleUpdateFlowName = (id: string) => {
    const name = editingFlowName.trim()
    if (name) {
      updateFlow(id, { name })
      goeyToast.success(name)
    }
    setEditingFlowId(null)
    setEditingFlowName("")
  }

  const handleDeleteFlow = (id: string) => {
    const ok = deleteFlow(id)
    if (ok) {
      if (selectedFlowId === id) setSelectedFlowId(flows[0]?.id ?? null)
      goeyToast.success("Flow deleted")
    } else {
      goeyToast.error("Cannot delete flow", { description: "Move or remove all leads in this flow first." })
    }
  }

  const handleSetDefaultFlow = (id: string) => {
    updateFlow(id, { isDefault: true })
    goeyToast.success("Default flow updated")
  }

  const handleAddStage = () => {
    if (!selectedFlowId) return
    const name = newStageName.trim() || "New stage"
    addStage(selectedFlowId, { name })
    setNewStageName("")
    goeyToast.success(name)
  }

  const handleUpdateStageName = (id: string) => {
    const name = editingStageName.trim()
    if (name) {
      updateStage(id, { name })
      goeyToast.success(name)
    }
    setEditingStageId(null)
    setEditingStageName("")
  }

  const handleMoveStageOrder = (stage: Stage, direction: "up" | "down") => {
    const idx = flowStages.findIndex((s) => s.id === stage.id)
    if (idx < 0) return
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= flowStages.length) return
    const other = flowStages[swapIdx]
    updateStage(stage.id, { order: other.order })
    updateStage(other.id, { order: stage.order })
  }

  const handleRequestDeleteStage = (stage: Stage) => {
    const leadCount = leads.filter((l) => l.stageId === stage.id).length
    if (leadCount > 0) {
      const otherStages = flowStages.filter((s) => s.id !== stage.id)
      if (otherStages.length === 0) {
        goeyToast.error("Cannot delete stage", { description: "Add another stage first, then move leads to it." })
        return
      }
      setDeleteStageState({
        stageId: stage.id,
        stageName: stage.name,
        leadCount,
        flowId: stage.flowId,
      })
    } else {
      deleteStage(stage.id)
      goeyToast.success("Stage deleted")
    }
  }

  const handleConfirmDeleteStage = (moveToStageId: string) => {
    if (!deleteStageState) return
    deleteStage(deleteStageState.stageId, moveToStageId)
    setDeleteStageState(null)
    goeyToast.success("Stage deleted", { description: "Leads were moved to the selected stage." })
  }

  const leadCountByFlow = (flowId: string) => leads.filter((l) => l.flowId === flowId).length

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Manage flows &amp; stages</SheetTitle>
            <SheetDescription>
              Add or edit flows (e.g. Leads, AEP) and their stages. Stages define the columns on your board.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pt-5 pb-5 px-2">
              <section>
                <h3 className="mb-2 text-sm font-medium text-foreground">Flows</h3>
                <div className="flex gap-2 overflow-visible">
                  <Input
                    placeholder="New flow name"
                    className="flex-1 ring-offset-0"
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddFlow()}
                  />
                  <Button size="sm" onClick={handleAddFlow}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ul className="mt-2 space-y-1">
                  {flows.sort((a, b) => a.order - b.order).map((flow) => (
                    <li
                      key={flow.id}
                      className={`
                        flex items-center gap-2 rounded-md border px-2 py-1.5
                        ${selectedFlowId === flow.id ? "bg-muted" : "hover:bg-muted/50"}
                      `}
                    >
                      {editingFlowId === flow.id ? (
                        <>
                          <Input
                            value={editingFlowName}
                            onChange={(e) => setEditingFlowName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateFlowName(flow.id)
                              if (e.key === "Escape") setEditingFlowId(null)
                            }}
                            className="h-8 flex-1 ring-offset-0"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleUpdateFlowName(flow.id)}>
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left text-sm font-medium"
                            onClick={() => setSelectedFlowId(flow.id)}
                          >
                            {flow.name}
                          </button>
                          {flow.isDefault && (
                            <span title="Default flow">
                              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {leadCountByFlow(flow.id)} contact{leadCountByFlow(flow.id) === 1 ? "" : "s"}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Flow actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingFlowId(flow.id)
                                  setEditingFlowName(flow.name)
                                }}
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Edit name
                              </DropdownMenuItem>
                              {!flow.isDefault && (
                                <DropdownMenuItem onClick={() => handleSetDefaultFlow(flow.id)}>
                                  <Star className="mr-2 h-3.5 w-3.5" />
                                  Set as default
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteFlow(flow.id)}
                                disabled={leadCountByFlow(flow.id) > 0}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete flow
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              {selectedFlow && (
                <section>
                  <h3 className="mb-2 text-sm font-medium text-foreground">Stages for &quot;{selectedFlow.name}&quot;</h3>
                  <div className="flex gap-2 overflow-visible">
                    <Input
                      placeholder="New stage name"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
                      className="flex-1 ring-offset-0"
                    />
                    <Button size="sm" onClick={handleAddStage}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {flowStages.map((stage, idx) => (
                      <li
                        key={stage.id}
                        className="flex items-center gap-1 rounded-md border px-2 py-1.5 hover:bg-muted/50"
                      >
                        {editingStageId === stage.id ? (
                          <>
                            <Input
                              value={editingStageName}
                              onChange={(e) => setEditingStageName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateStageName(stage.id)
                                if (e.key === "Escape") setEditingStageId(null)
                              }}
                              className="h-8 flex-1 ring-offset-0"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={() => handleUpdateStageName(stage.id)}>
                              Save
                            </Button>
                          </>
                        ) : (
                          <>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 shrink-0 rounded p-0"
                                  aria-label="Change stage color"
                                >
                                  <span
                                    className="h-3.5 w-3.5 rounded-sm"
                                    style={{
                                      backgroundColor: isHexColor(stage.colorKey)
                                        ? stage.colorKey
                                        : STAGE_COLOR_PRESETS[0],
                                    }}
                                  />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3" align="start">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">Presets</p>
                                <div className="grid grid-cols-4 gap-1.5 mb-3">
                                  {STAGE_COLOR_PRESETS.map((hex) => (
                                    <button
                                      key={hex}
                                      type="button"
                                      className={`h-7 w-7 rounded border-2 transition-colors hover:opacity-90 ${stage.colorKey === hex ? "border-foreground ring-1 ring-foreground/20" : "border-transparent"}`}
                                      style={{ backgroundColor: hex }}
                                      onClick={() => updateStage(stage.id, { colorKey: hex })}
                                      aria-label={`Color ${hex}`}
                                    />
                                  ))}
                                </div>
                                <p className="mb-2 text-xs font-medium text-muted-foreground">Custom</p>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={isHexColor(stage.colorKey) ? stage.colorKey : "#6b7280"}
                                    onChange={(e) => updateStage(stage.id, { colorKey: e.target.value })}
                                    className="h-9 w-14 cursor-pointer rounded border border-input bg-transparent p-0.5"
                                    aria-label="Pick custom color"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {isHexColor(stage.colorKey) ? stage.colorKey : "Any color"}
                                  </span>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left text-sm hover:underline focus:outline-none focus:underline"
                              onClick={() => {
                                setEditingStageId(stage.id)
                                setEditingStageName(stage.name)
                              }}
                            >
                              {stage.name}
                            </button>
                            <div className="flex items-center gap-0.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleMoveStageOrder(stage, "up")}
                                disabled={idx === 0}
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleMoveStageOrder(stage, "down")}
                                disabled={idx === flowStages.length - 1}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Stage actions">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingStageId(stage.id)
                                    setEditingStageName(stage.name)
                                  }}
                                >
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
                                  Edit name
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleRequestDeleteStage(stage)}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Delete stage
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  {flowStages.length === 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">No stages yet. Add one above.</p>
                  )}
                </section>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {deleteStageState && (
        <DeleteStageDialog
          open={!!deleteStageState}
          onOpenChange={(o) => !o && setDeleteStageState(null)}
          stageName={deleteStageState.stageName}
          leadCount={deleteStageState.leadCount}
          otherStages={flowStages.filter((s) => s.id !== deleteStageState.stageId)}
          onConfirm={handleConfirmDeleteStage}
        />
      )}
    </>
  )
}
