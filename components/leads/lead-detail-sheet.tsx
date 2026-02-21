"use client"

import { useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import { Phone, Mail, MessageSquare, CalendarPlus, ArrowRightLeft } from "@/components/icons"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StageBadge } from "./stage-badge"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import type { Lead } from "@/lib/types"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"

interface LeadDetailSheetProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CREATED_BY = "Sarah Mitchell"

export function LeadDetailSheet({ lead, open, onOpenChange }: LeadDetailSheetProps) {
  const { updateLeadStage, addActivity, getStagesByFlowId, getStageById, flows } = useCRMStore()
  const [createTaskOpen, setCreateTaskOpen] = useState(false)

  if (!lead) return null

  const flowStages = getStagesByFlowId(lead.flowId)
  const currentStage = getStageById(lead.stageId)

  const handleStageChange = (newStageId: string) => {
    updateLeadStage(lead.id, newStageId)
    const stage = getStageById(newStageId)
    if (lead.clientId) {
      const flow = flows.find((f) => f.id === lead.flowId)
      const flowName = flow?.name ?? lead.flowId
      const stageName = stage?.name ?? newStageId
      addActivity({
        id: `act-${Date.now()}`,
        relatedType: "Client",
        relatedId: lead.clientId,
        type: "note",
        description: `Moved to ${stageName} in ${flowName}`,
        createdAt: new Date().toISOString(),
        createdBy: CREATED_BY,
      })
    }
    goeyToast.success(`Moved to ${stage?.name ?? newStageId}`)
  }

  const handleLogActivity = (type: "call" | "email" | "text") => {
    addActivity({
      id: `act-${Date.now()}`,
      relatedType: "Lead",
      relatedId: lead.id,
      type,
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} with ${lead.firstName} ${lead.lastName}`,
      createdAt: new Date().toISOString(),
      createdBy: "Sarah Mitchell",
    })
    goeyToast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} logged`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-lg">
                {lead.firstName} {lead.lastName}
              </SheetTitle>
              <SheetDescription className="mt-1">
                Lead &middot; {lead.source} &middot; Created{" "}
                {formatDistanceToNow(parseLocalDate(lead.createdAt), { addSuffix: true })}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-2 pb-4">
          {currentStage && <StageBadge name={currentStage.name} colorKey={currentStage.colorKey} />}
          {lead.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pb-4">
          <Button size="sm" variant="outline" onClick={() => handleLogActivity("call")}>
            <Phone className="mr-1.5 h-3.5 w-3.5" />
            Call
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleLogActivity("text")}>
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Text
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleLogActivity("email")}>
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Email
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCreateTaskOpen(true)}>
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
            Task
          </Button>
        </div>

        <CreateTaskDialog
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          relatedType="Lead"
          relatedId={lead.id}
          relatedName={`${lead.firstName} ${lead.lastName}`}
        />

        <Separator />

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Phone</p>
              <p className="text-sm text-foreground">{lead.phone}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Email</p>
              <p className="text-sm text-foreground">{lead.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Source</p>
              <p className="text-sm text-foreground">{lead.source}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
              <p className="text-sm text-foreground">{lead.assignedTo}</p>
            </div>
          </div>
          {lead.nextFollowUpAt && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Next Follow-up</p>
              <p className="text-sm text-foreground">
                {format(parseLocalDate(lead.nextFollowUpAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}
        </div>

        <Separator />

        <div className="py-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Move to Stage</p>
          </div>
          <Select value={lead.stageId} onValueChange={handleStageChange}>
            <SelectTrigger className="mt-2 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {flowStages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="py-4">
          <p className="text-xs font-medium text-muted-foreground">Notes</p>
          <div className="mt-2 space-y-2">
            {lead.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              lead.notes.map((note, i) => (
                <div
                  key={i}
                  className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground"
                >
                  {note}
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
