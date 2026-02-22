"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  StickyNote,
  Plus,
  Pencil,
} from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"
import { LogActivityDialog } from "@/components/activities/log-activity-dialog"
import type { ActivityType } from "@/lib/types"
import type { SectionProps } from "./types"

const activityIcons: Record<Exclude<ActivityType, "note">, React.ElementType> = {
  call: Phone,
  email: Mail,
  text: MessageSquare,
  appointment: Calendar,
}

const activityColors: Record<Exclude<ActivityType, "note">, string> = {
  call: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  email: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  text: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  appointment: "bg-chart-4/10 text-chart-4 border-chart-4/20",
}

const activityLabels: Record<Exclude<ActivityType, "note">, string> = {
  call: "Call",
  email: "Email",
  text: "Text",
  appointment: "Appointment",
}

export function NotesSection({ client, activities }: SectionProps) {
  const { updateClient } = useCRMStore()
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [logActivityOpen, setLogActivityOpen] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [editingNoteCreatedAt, setEditingNoteCreatedAt] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState("")

  const clientNotes = client.notes ?? []
  const actionActivities = activities.filter((a) => a.type !== "note")
  const sortedActivities = [...actionActivities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const handleAddNote = () => {
    if (!noteText.trim()) return
    const createdAt = new Date().toISOString()
    updateClient(client.id, {
      notes: [...clientNotes, { text: noteText.trim(), createdAt }],
    })
    setNoteText("")
    setAddNoteOpen(false)
    goeyToast.success("Note added")
  }

  const handleSaveEdit = (createdAt: string) => {
    const trimmed = editingDraft.trim()
    if (!trimmed) return
    const now = new Date().toISOString()
    updateClient(client.id, {
      notes: clientNotes.map((n) =>
        n.createdAt === createdAt ? { ...n, text: trimmed, updatedAt: now } : n
      ),
    })
    setEditingNoteCreatedAt(null)
    setEditingDraft("")
    goeyToast.success("Note updated")
  }

  return (
    <div className="space-y-6">
      {/* Notes — agent-added */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
              <StickyNote className="h-4 w-4 text-chart-2" />
            </div>
            Notes
            {clientNotes.length > 0 && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({clientNotes.length})
              </span>
            )}
          </CardTitle>
          <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add a Note</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <Label htmlFor="note-text">Note</Label>
                <Textarea
                  id="note-text"
                  placeholder="Enter your note about this client..."
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddNoteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={!noteText.trim()}>
                  Save Note
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6">
          {clientNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <StickyNote className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                No notes yet. Add a note to capture something about this client.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setAddNoteOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Note
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {[...clientNotes]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((note) => (
                <div
                  key={note.createdAt}
                  className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-foreground"
                >
                  {editingNoteCreatedAt === note.createdAt ? (
                    <>
                      <Textarea
                        value={editingDraft}
                        onChange={(e) => setEditingDraft(e.target.value)}
                        rows={3}
                        className="mb-2 resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(note.createdAt)} disabled={!editingDraft.trim()}>
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
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingNoteCreatedAt(note.createdAt); setEditingDraft(note.text) }}
                          title="Edit note"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        {note.updatedAt && (
                          <span> · Edited {format(new Date(note.updatedAt), "MMM d 'at' h:mm a")}</span>
                        )}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities — when an action is taken */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            Activity
            {sortedActivities.length > 0 && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({sortedActivities.length})
              </span>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setLogActivityOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Log activity
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <LogActivityDialog
            open={logActivityOpen}
            onOpenChange={setLogActivityOpen}
            relatedType="Client"
            relatedId={client.id}
          />
          {sortedActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Calendar className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                No activity yet. Log a call, email, text, or appointment above.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setLogActivityOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Log activity
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedActivities.map((activity) => {
                const Icon = activityIcons[activity.type as Exclude<ActivityType, "note">]
                const colorClass = activityColors[activity.type as Exclude<ActivityType, "note">]
                const label = activityLabels[activity.type as Exclude<ActivityType, "note">]
                return (
                  <div
                    key={activity.id}
                    className="group flex items-start gap-4 rounded-lg p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-sm text-foreground leading-relaxed">{activity.description}</p>
                      {activity.outcome && (
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          Outcome: {activity.outcome}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {activity.createdBy} · {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
