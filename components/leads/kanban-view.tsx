"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import { GripVertical, Phone, Calendar } from "lucide-react"
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LeadDetailSheet } from "./lead-detail-sheet"
import type { Lead, Stage } from "@/lib/types"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"

const stageColumnMutedClass: Record<string, string> = {
  primary: "bg-muted/30 border border-primary border-l-4 border-l-primary",
  "chart-2": "bg-muted/30 border border-chart-2 border-l-4 border-l-chart-2",
  "chart-3": "bg-muted/30 border border-chart-3 border-l-4 border-l-chart-3",
  warning: "bg-muted/30 border border-warning border-l-4 border-l-warning",
  "chart-4": "bg-muted/30 border border-chart-4 border-l-4 border-l-chart-4",
  success: "bg-muted/30 border border-success border-l-4 border-l-success",
  muted: "bg-muted/30 border border-muted-foreground border-l-4 border-l-muted-foreground",
}

function isHexColor(value: string | undefined): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)
}

const AUTO_SCROLL_ZONE_PX = 60
const AUTO_SCROLL_SPEED = 12

interface KanbanViewProps {
  leads: Lead[]
  stages: Stage[]
}

function LeadCardContent({ lead }: { lead: Lead }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{lead.source}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {lead.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {lead.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {lead.phone}
          </span>
        )}
      </div>
      {lead.nextFollowUpAt && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {format(parseLocalDate(lead.nextFollowUpAt), "MMM d")}
        </div>
      )}
    </>
  )
}

function DraggableLeadCard({
  lead,
  stages,
  onOpenDetail,
  onMoveTo,
  justFinishedDragRef,
}: {
  lead: Lead
  stages: Stage[]
  onOpenDetail: (lead: Lead) => void
  onMoveTo: (leadId: string, stageId: string) => void
  justFinishedDragRef: React.MutableRefObject<boolean>
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead, type: "lead" },
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const handleClick = () => {
    if (justFinishedDragRef.current) {
      justFinishedDragRef.current = false
      return
    }
    onOpenDetail(lead)
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`select-none cursor-grab p-3 transition-shadow hover:shadow-md active:cursor-grabbing ${isDragging ? "opacity-50 shadow-lg" : ""}`}
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{lead.source}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
              <span className="sr-only">Move lead</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {stages
              .filter((s) => s.id !== lead.stageId)
              .map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveTo(lead.id, s.id)
                  }}
                >
                  Move to {s.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {lead.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {lead.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {lead.phone}
          </span>
        )}
      </div>
      {lead.nextFollowUpAt && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {format(parseLocalDate(lead.nextFollowUpAt), "MMM d")}
        </div>
      )}
    </Card>
  )
}

function DroppableColumn({ stage, children }: { stage: Stage; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: "stage", stageId: stage.id } })
  const colorKey = stage.colorKey ?? "muted"
  const isCustom = isHexColor(colorKey)
  const mutedBg = isCustom ? "bg-muted/30 border border-l-4" : (stageColumnMutedClass[colorKey] ?? stageColumnMutedClass.muted)

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl ${mutedBg} transition-colors ${isOver ? "ring-2 ring-primary/50 ring-offset-2" : ""}`}
      style={isCustom ? { borderColor: colorKey, borderLeftColor: colorKey } : undefined}
    >
      {children}
    </div>
  )
}

const CREATED_BY = "Sarah Mitchell"

export function KanbanView({ leads, stages }: KanbanViewProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const justFinishedDragRef = useRef(false)
  const { updateLeadStage, addActivity, flows } = useCRMStore()

  const getStageName = useCallback((stageId: string) => stages.find((s) => s.id === stageId)?.name ?? stageId, [stages])

  const handleMoveTo = useCallback(
    (leadId: string, stageId: string) => {
      const lead = leads.find((l) => l.id === leadId)
      updateLeadStage(leadId, stageId)
      if (lead?.clientId) {
        const flow = flows.find((f) => f.id === lead.flowId)
        const flowName = flow?.name ?? lead.flowId
        const stageName = getStageName(stageId)
        addActivity({
          id: `act-${Date.now()}-${leadId}`,
          relatedType: "Client",
          relatedId: lead.clientId,
          type: "note",
          description: `Moved to ${stageName} in ${flowName}`,
          createdAt: new Date().toISOString(),
          createdBy: CREATED_BY,
        })
      }
      goeyToast.success(`Moved to ${getStageName(stageId)}`)
    },
    [leads, updateLeadStage, addActivity, flows, getStageName]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === "lead") setActiveId(active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      justFinishedDragRef.current = true
      if (!over || active.id === over.id) return
      const leadId = active.id as string
      const overData = over.data.current
      if (overData?.type === "stage" && overData.stageId) {
        const newStageId = overData.stageId as string
        const lead = leads.find((l) => l.id === leadId)
        if (lead && lead.stageId !== newStageId) {
          handleMoveTo(leadId, newStageId)
        }
      }
    },
    [leads, handleMoveTo]
  )

  useEffect(() => {
    if (!activeId || !scrollRef.current) return
    const el = scrollRef.current
    let rafId: number

    const tick = () => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const zone = AUTO_SCROLL_ZONE_PX
      const leftEdge = rect.left
      const rightEdge = rect.right
      const scrollWidth = el.scrollWidth
      const clientWidth = el.clientWidth
      if (scrollWidth <= clientWidth) {
        rafId = requestAnimationFrame(tick)
        return
      }
      let dx = 0
      if (lastX !== null) {
        if (lastX < leftEdge + zone) dx = -AUTO_SCROLL_SPEED
        else if (lastX > rightEdge - zone) dx = AUTO_SCROLL_SPEED
      }
      if (dx !== 0) {
        el.scrollLeft = Math.max(0, Math.min(el.scrollLeft + dx, scrollWidth - clientWidth))
      }
      rafId = requestAnimationFrame(tick)
    }

    let lastX: number | null = null
    const onPointerMove = (e: PointerEvent) => {
      lastX = e.clientX
    }
    window.addEventListener("pointermove", onPointerMove)
    rafId = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      cancelAnimationFrame(rafId)
    }
  }, [activeId])

  return (
    <>
      <div
        ref={scrollRef}
        className="h-full w-full overflow-x-auto overflow-y-hidden"
        style={{ scrollBehavior: "auto" }}
      >
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-6 pb-4 min-w-max">
            {stages.map((stage) => {
              const stageLeads = leads.filter((l) => l.stageId === stage.id)
              return (
                <DroppableColumn key={stage.id} stage={stage}>
                  <div className="flex items-center gap-2 p-3 pb-2">
                    <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
                    <Badge variant="secondary" className="ml-auto text-[11px]">
                      {stageLeads.length}
                    </Badge>
                  </div>
                  <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto p-2 pt-0">
                    {stageLeads.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-6">
                        <p className="text-xs text-muted-foreground">No leads</p>
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <DraggableLeadCard
                          key={`${stage.id}-${lead.id}`}
                          lead={lead}
                          stages={stages}
                          onOpenDetail={setSelectedLead}
                          onMoveTo={handleMoveTo}
                          justFinishedDragRef={justFinishedDragRef}
                        />
                      ))
                    )}
                  </div>
                </DroppableColumn>
              )
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeLead ? (
              <Card className="cursor-grabbing w-72 shrink-0 p-3 shadow-xl ring-2 ring-primary/20">
                <LeadCardContent lead={activeLead} />
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <LeadDetailSheet
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null)
        }}
      />
    </>
  )
}
