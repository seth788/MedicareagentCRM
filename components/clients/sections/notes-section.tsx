"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  StickyNote,
  Plus,
} from "lucide-react"
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
import type { ActivityType } from "@/lib/types"
import type { SectionProps } from "./types"

const activityIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  email: Mail,
  text: MessageSquare,
  appointment: Calendar,
  note: StickyNote,
}

const activityColors: Record<ActivityType, string> = {
  call: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  email: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  text: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  appointment: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  note: "bg-muted text-muted-foreground border-border",
}

const activityLabels: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  text: "Text",
  appointment: "Appointment",
  note: "Note",
}

export function NotesSection({ client, activities }: SectionProps) {
  const { addActivity } = useCRMStore()
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState("")

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const handleAddNote = () => {
    if (!noteText.trim()) return
    addActivity({
      id: `act-${Date.now()}`,
      relatedType: "Client",
      relatedId: client.id,
      type: "note",
      description: noteText.trim(),
      createdAt: new Date().toISOString(),
      createdBy: "Sarah Mitchell",
    })
    setNoteText("")
    setAddNoteOpen(false)
    goeyToast.success("Note added")
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-4">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
            <StickyNote className="h-4 w-4 text-chart-2" />
          </div>
          Activity timeline
          {sortedActivities.length > 0 && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({sortedActivities.length})
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
        {sortedActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <StickyNote className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              No activity recorded
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a note to start the timeline for this client.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setAddNoteOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Note
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" aria-hidden="true" />
            <div className="space-y-1">
              {sortedActivities.map((activity) => {
                const Icon = activityIcons[activity.type]
                const colorClass = activityColors[activity.type]
                return (
                  <div
                    key={activity.id}
                    className="group relative flex items-start gap-4 rounded-lg p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {activityLabels[activity.type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground leading-relaxed">{activity.description}</p>
                      {activity.outcome && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Outcome: {activity.outcome}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {activity.createdBy}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
