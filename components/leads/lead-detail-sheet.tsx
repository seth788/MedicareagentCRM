"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import { Phone, Mail, MessageSquare, CalendarPlus, ArrowRightLeft, Clock, Share05, Calendar, StickyNote, ChevronRight, Pencil } from "@/components/icons"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StageBadge } from "./stage-badge"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { LogActivityDialog } from "@/components/activities/log-activity-dialog"
import { getLeadLastTouchedAt } from "@/lib/lead-utils"
import type { Lead, ActivityType } from "@/lib/types"
import { useCRMStore } from "@/lib/store"
import { toast } from "sonner"

const REMOVE_PREFIX = "__remove__"
const RECENT_ACTIVITIES_LIMIT = 4

const activityIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  email: Mail,
  text: MessageSquare,
  appointment: Calendar,
  note: StickyNote,
}

const activityColors: Record<ActivityType, string> = {
  call: "bg-chart-1/10 text-chart-1",
  email: "bg-chart-2/10 text-chart-2",
  text: "bg-chart-3/10 text-chart-3",
  appointment: "bg-chart-4/10 text-chart-4",
  note: "bg-muted text-muted-foreground",
}

interface LeadDetailSheetProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}


export function LeadDetailSheet({ lead, open, onOpenChange }: LeadDetailSheetProps) {
  const {
    leads,
    clients,
    activities,
    tasks,
    updateLeadStage,
    updateLead,
    updateClient,
    addActivity,
    getStagesByFlowId,
    getStageById,
    flows,
    deleteLead,
    currentAgent,
  } = useCRMStore()
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [logActivityOpen, setLogActivityOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [editingNoteCreatedAt, setEditingNoteCreatedAt] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState("")

  const clientLeads = useMemo(() => {
    if (!lead) return []
    if (lead.clientId) {
      return leads.filter((l) => l.clientId === lead.clientId)
    }
    return [lead]
  }, [lead, leads])

  const displayNotes = useMemo(() => {
    if (!lead) return []
    if (lead.clientId) {
      const client = clients.find((c) => c.id === lead.clientId)
      return client?.notes ?? []
    }
    return lead.notes
  }, [lead, clients])

  const lastTouchedAt = useMemo(() => {
    if (!lead) return null
    return getLeadLastTouchedAt(lead, { clients, activities, tasks })
  }, [lead, clients, activities, tasks])

  const recentActivities = useMemo(() => {
    if (!lead) return []
    const relatedIds = new Set<string>([lead.id])
    if (lead.clientId) relatedIds.add(lead.clientId)
    return activities
      .filter(
        (a) =>
          (a.relatedType === "Lead" && relatedIds.has(a.relatedId)) ||
          (a.relatedType === "Client" && relatedIds.has(a.relatedId))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, RECENT_ACTIVITIES_LIMIT)
  }, [lead, activities])

  if (!lead) return null

  const flowStages = getStagesByFlowId(lead.flowId)
  const currentStage = getStageById(lead.stageId)

  const handleStageChange = (targetLeadId: string, newStageId: string) => {
    const targetLead = clientLeads.find((l) => l.id === targetLeadId) ?? lead
    updateLeadStage(targetLeadId, newStageId)
    const stage = getStageById(newStageId)
    if (targetLead.clientId) {
      const flow = flows.find((f) => f.id === targetLead.flowId)
      const flowName = flow?.name ?? targetLead.flowId
      const stageName = stage?.name ?? newStageId
      addActivity({
        id: `act-${Date.now()}`,
        relatedType: "Client",
        relatedId: targetLead.clientId,
        type: "note",
        description: `Moved to ${stageName} in ${flowName}`,
        createdAt: new Date().toISOString(),
        createdBy: currentAgent,
      })
    }
    toast.success(`Moved to ${stage?.name ?? newStageId}`)
  }

  const handleRemoveFromFlow = (leadToRemove: Lead) => {
    const flow = flows.find((f) => f.id === leadToRemove.flowId)
    const flowName = flow?.name ?? "flow"
    if (leadToRemove.clientId) {
      addActivity({
        id: `act-${Date.now()}`,
        relatedType: "Client",
        relatedId: leadToRemove.clientId,
        type: "note",
        description: `Removed from "${flowName}" Flow`,
        createdAt: new Date().toISOString(),
        createdBy: currentAgent,
      })
    }
    deleteLead(leadToRemove.id)
    toast.success("Removed from flow", {
      description: `${leadToRemove.firstName} ${leadToRemove.lastName} is no longer in ${flowName}`,
    })
    if (leadToRemove.id === lead.id) {
      onOpenChange(false)
    }
  }

  const handleFlowSelectValueChange = (targetLead: Lead, value: string) => {
    if (value.startsWith(REMOVE_PREFIX)) {
      const leadId = value.slice(REMOVE_PREFIX.length)
      const toRemove = clientLeads.find((l) => l.id === leadId)
      if (toRemove) handleRemoveFromFlow(toRemove)
      return
    }
    handleStageChange(targetLead.id, value)
  }

  const handleLogActivity = (type: "call" | "email" | "text") => {
    addActivity({
      id: `act-${Date.now()}`,
      relatedType: "Lead",
      relatedId: lead.id,
      type,
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} with ${lead.firstName} ${lead.lastName}`,
      createdAt: new Date().toISOString(),
      createdBy: currentAgent,
    })
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} logged`)
  }

  const handleSaveNote = () => {
    const trimmed = noteDraft.trim()
    if (!trimmed) return
    setSavingNote(true)
    const createdAt = new Date().toISOString()
    const entry = { text: trimmed, createdAt }
    updateLead(lead.id, { notes: [...lead.notes, entry] })
    if (lead.clientId) {
      const client = clients.find((c) => c.id === lead.clientId)
      const clientNotes = client?.notes ?? []
      updateClient(lead.clientId, { notes: [...clientNotes, entry] })
    }
    setNoteDraft("")
    setSavingNote(false)
    toast.success("Note saved")
  }

  const handleSaveNoteEdit = (createdAt: string) => {
    const trimmed = editingDraft.trim()
    if (!trimmed || !lead) return
    const now = new Date().toISOString()
    if (lead.clientId) {
      const client = clients.find((c) => c.id === lead.clientId)
      const clientNotes = client?.notes ?? []
      updateClient(lead.clientId, {
        notes: clientNotes.map((n) =>
          n.createdAt === createdAt ? { ...n, text: trimmed, updatedAt: now } : n
        ),
      })
    }
    const updatedLeadNotes = lead.notes.map((n) =>
      n.createdAt === createdAt ? { ...n, text: trimmed, updatedAt: now } : n
    )
    updateLead(lead.id, { notes: updatedLeadNotes })
    setEditingNoteCreatedAt(null)
    setEditingDraft("")
    toast.success("Note updated")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 pr-10">
            <SheetTitle className="text-lg">
              {lead.firstName} {lead.lastName}
            </SheetTitle>
            {lead.clientId && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild title="View profile">
                <Link href={`/clients/${lead.clientId}`}>
                  <Share05 className="h-4 w-4" />
                  <span className="sr-only">View profile</span>
                </Link>
              </Button>
            )}
          </div>
          <SheetDescription className="mt-1">
            Lead &middot; {lead.source}
          </SheetDescription>
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
          <Button size="sm" variant="outline" onClick={() => setLogActivityOpen(true)}>
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Log activity
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCreateTaskOpen(true)}>
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
            Task
          </Button>
        </div>

        <LogActivityDialog
          open={logActivityOpen}
          onOpenChange={setLogActivityOpen}
          relatedType="Lead"
          relatedId={lead.id}
          alsoLogToClientId={lead.clientId}
        />

        <CreateTaskDialog
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          relatedType="Lead"
          relatedId={lead.id}
          relatedName={`${lead.firstName} ${lead.lastName}`}
        />

        <Separator />

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-4">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium text-muted-foreground">Phone</p>
            <p className="text-xs text-foreground truncate" title={lead.phone}>{lead.phone}</p>
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium text-muted-foreground">Email</p>
            <p className="text-xs text-foreground truncate" title={lead.email}>{lead.email}</p>
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium text-muted-foreground">Source</p>
            <p className="text-xs text-foreground truncate">{lead.source}</p>
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium text-muted-foreground">Assigned To</p>
            <p className="text-xs text-foreground truncate">{lead.assignedTo}</p>
          </div>
          {lead.nextFollowUpAt && (
            <div className="min-w-0 space-y-0.5 col-span-2">
              <p className="text-[11px] font-medium text-muted-foreground">Next Follow-up</p>
              <p className="text-xs text-foreground">
                {format(parseLocalDate(lead.nextFollowUpAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}
          {lastTouchedAt && (
            <div className="min-w-0 space-y-0.5 col-span-2">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0" />
                Last touched
              </p>
              <p className="text-xs text-foreground">
                {formatDistanceToNow(new Date(lastTouchedAt), { addSuffix: true })}
              </p>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-6 py-4">
          {clientLeads.map((clientLead) => {
            const flow = flows.find((f) => f.id === clientLead.flowId)
            const flowName = flow?.name ?? clientLead.flowId
            const stages = getStagesByFlowId(clientLead.flowId)
            return (
              <div key={clientLead.id}>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Move to Stage {clientLeads.length > 1 ? `— ${flowName}` : ""}
                  </p>
                </div>
                <Select
                  value={clientLead.stageId}
                  onValueChange={(value) => handleFlowSelectValueChange(clientLead, value)}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                    <SelectItem
                      value={`${REMOVE_PREFIX}${clientLead.id}`}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      Remove From &quot;{flowName}&quot;
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>

        <Separator />

        <div className="py-4 space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Notes</p>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a note..."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSaveNote()
                }
              }}
              rows={2}
              className="min-h-[60px] resize-none"
            />
            <Button
              type="button"
              onClick={handleSaveNote}
              disabled={!noteDraft.trim() || savingNote}
              className="shrink-0"
            >
              Save
            </Button>
          </div>
          <div className="space-y-2">
            {displayNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              [...displayNotes]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((note) => (
                <div
                  key={note.createdAt}
                  className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground"
                >
                  {editingNoteCreatedAt === note.createdAt ? (
                    <>
                      <Textarea
                        value={editingDraft}
                        onChange={(e) => setEditingDraft(e.target.value)}
                        rows={2}
                        className="mb-2 min-h-[60px] resize-none text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveNoteEdit(note.createdAt)} disabled={!editingDraft.trim()}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingNoteCreatedAt(null); setEditingDraft("") }}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1">{note.text}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingNoteCreatedAt(note.createdAt); setEditingDraft(note.text) }}
                          title="Edit note"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        {note.updatedAt && (
                          <span> · Edited {format(new Date(note.updatedAt), "MMM d 'at' h:mm a")}</span>
                        )}
                      </p>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <Separator />

          <div className="space-y-3 py-4">
            <p className="text-xs font-medium text-muted-foreground">Recent activity</p>
            {recentActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {recentActivities.map((activity) => {
                    const Icon = activityIcons[activity.type]
                    const colorClass = activityColors[activity.type]
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-2.5 rounded-lg border bg-muted/20 px-2.5 py-2"
                      >
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${colorClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground">{activity.description}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {activity.createdBy} · {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {lead.clientId && (
                  <Link
                    href={`/clients/${lead.clientId}?section=notes`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    See all activities
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
