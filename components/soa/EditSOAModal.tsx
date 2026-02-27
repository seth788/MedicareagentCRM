"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { toast } from "sonner"
import type { SOARecord } from "@/lib/db/soa"

const INITIAL_CONTACT_OPTIONS = [
  "Phone",
  "Email",
  "Mail",
  "In-Person/Walk-in",
  "Internet/Website",
  "Referral",
]

interface EditSOAModalProps {
  soa: SOARecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditSOAModal({
  soa,
  open,
  onOpenChange,
  onSuccess,
}: EditSOAModalProps) {
  const [agentName, setAgentName] = useState(soa.agentName)
  const [appointmentDate, setAppointmentDate] = useState(soa.appointmentDate ?? "")
  const [initialContactMethod, setInitialContactMethod] = useState(
    soa.initialContactMethod ?? ""
  )
  const [saving, setSaving] = useState(false)

  const hasChanges =
    agentName !== soa.agentName ||
    appointmentDate !== (soa.appointmentDate ?? "") ||
    initialContactMethod !== (soa.initialContactMethod ?? "")

  const handleSave = async () => {
    if (!hasChanges) return
    setSaving(true)
    try {
      const res = await fetch(`/api/soa/${soa.id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: agentName.trim(),
          appointmentDate: appointmentDate || null,
          initialContactMethod: initialContactMethod || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to update")
        return
      }
      toast.success("SOA updated")
      if (data.warning) toast.warning(data.warning)
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit SOA</DialogTitle>
          <DialogDescription>
            Update appointment details. Signatures and products cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Agent Name</Label>
            <Input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Agent name"
            />
          </div>
          <div className="space-y-2">
            <Label>Appointment Date</Label>
            <DatePicker
              value={appointmentDate}
              onChange={setAppointmentDate}
              placeholder="Select date"
            />
          </div>
          <div className="space-y-2">
            <Label>Method of Contact</Label>
            <Select value={initialContactMethod} onValueChange={setInitialContactMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {INITIAL_CONTACT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? "Saving…" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
