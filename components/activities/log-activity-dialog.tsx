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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"
import type { ActivityType } from "@/lib/types"


const ACTIVITY_TYPES: { value: Exclude<ActivityType, "note">; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "text", label: "Text" },
  { value: "appointment", label: "Appointment" },
]

export interface LogActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  relatedType: "Lead" | "Client"
  relatedId: string
  /** When set (e.g. from lead sheet with linked client), also add the same activity to this client so it appears on the client profile. */
  alsoLogToClientId?: string
}

export function LogActivityDialog({
  open,
  onOpenChange,
  relatedType,
  relatedId,
  alsoLogToClientId,
}: LogActivityDialogProps) {
  const { addActivity, currentAgent } = useCRMStore()
  const [type, setType] = useState<Exclude<ActivityType, "note">>("call")
  const [description, setDescription] = useState("")
  const [outcome, setOutcome] = useState("")

  useEffect(() => {
    if (open) {
      setType("call")
      setDescription("")
      setOutcome("")
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedDesc = description.trim()
    if (!trimmedDesc) {
      goeyToast.error("Please enter a description")
      return
    }
    const now = new Date().toISOString()
    const activity = {
      id: `act-${Date.now()}`,
      relatedType,
      relatedId,
      type,
      description: trimmedDesc,
      outcome: outcome.trim() || undefined,
      createdAt: now,
      createdBy: currentAgent,
    }
    addActivity(activity)
    if (alsoLogToClientId) {
      addActivity({
        ...activity,
        id: `act-${Date.now()}-client`,
        relatedType: "Client",
        relatedId: alsoLogToClientId,
        createdBy: currentAgent,
      })
    }
    goeyToast.success("Activity logged")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="log-activity-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as Exclude<ActivityType, "note">)}>
              <SelectTrigger id="log-activity-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="log-activity-desc">Description</Label>
            <Textarea
              id="log-activity-desc"
              placeholder="e.g. Discussed plan options, left voicemail"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="log-activity-outcome">Outcome (optional)</Label>
            <Input
              id="log-activity-outcome"
              placeholder="e.g. Will call back next week"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="min-h-[40px] w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-[40px] w-full sm:w-auto" disabled={!description.trim()}>
              Log activity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
