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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <StickyNote className="h-5 w-5 text-primary" />
          Activity timeline
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
      <CardContent className="p-6 pt-0">
        {sortedActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <StickyNote className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
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
          <div className="divide-y">
            {sortedActivities.map((activity) => {
              const Icon = activityIcons[activity.type]
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 py-4 first:pt-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{activity.description}</p>
                    {activity.outcome && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Outcome: {activity.outcome}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.createdBy} ·{" "}
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
