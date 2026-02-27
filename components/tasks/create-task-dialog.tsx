"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCRMStore } from "@/lib/store"
import { toast } from "sonner"
import type { Task } from "@/lib/types"

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  relatedType: "Client" | "Lead"
  relatedId: string
  relatedName: string
  defaultTitle?: string
  defaultDescription?: string
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  relatedType,
  relatedId,
  relatedName,
  defaultTitle = "",
  defaultDescription = "",
}: CreateTaskDialogProps) {
  const { addTask, addActivity, currentAgent } = useCRMStore()
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [dueTime, setDueTime] = useState("09:00")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle || `Follow up with ${relatedName}`)
      setDueDate(toLocalDateString(new Date()))
      setDueTime("09:00")
      setDescription(defaultDescription)
    }
  }, [open, relatedName, defaultTitle, defaultDescription])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error("Please enter a task title")
      return
    }
    const timePart = dueTime || "09:00"
    const dueIso = dueDate
      ? new Date(dueDate + "T" + timePart + ":00").toISOString()
      : new Date().toISOString()
    const task: Task = {
      id: crypto.randomUUID(),
      relatedType,
      relatedId,
      relatedName,
      title: trimmedTitle,
      description: description.trim() || undefined,
      dueDate: dueIso,
      createdAt: new Date().toISOString(),
    }
    addTask(task)
    const dueDisplay = dueDate
      ? dueTime
        ? `${dueDate} at ${dueTime}`
        : dueDate
      : ""
    addActivity({
      id: `act-${Date.now()}`,
      relatedType,
      relatedId,
      type: "note",
      description: `Task: ${trimmedTitle}${dueDisplay ? ` — Due ${dueDisplay}` : ""}`,
      createdAt: new Date().toISOString(),
      createdBy: currentAgent,
    })
    toast.success("Task created")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 py-2">
          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder={`e.g. Follow up with ${relatedName}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-due">Due date</Label>
              <DatePicker
                id="task-due"
                value={dueDate}
                onChange={setDueDate}
                placeholder="Pick a date"
              />
            </div>
            <div>
              <Label htmlFor="task-notify-time">Notify at</Label>
              <Input
                id="task-notify-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="task-desc">Description (optional)</Label>
            <Textarea
              id="task-desc"
              placeholder="Add details..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="min-h-[40px] w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-[40px] w-full sm:w-auto" disabled={!title.trim()}>
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
