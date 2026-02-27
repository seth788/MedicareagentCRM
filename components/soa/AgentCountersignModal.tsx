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

const PRODUCT_LABELS: Record<string, string> = {
  part_d: "Part D (PDP)",
  part_c: "Part C (MAPD)",
  dental_vision_hearing: "Dental/Vision/Hearing",
  hospital_indemnity: "Hospital Indemnity",
  medigap: "Medigap",
}

const INITIAL_CONTACT_OPTIONS = [
  "Phone",
  "Email",
  "Mail",
  "In-Person/Walk-in",
  "Internet/Website",
  "Referral",
]

interface AgentCountersignModalProps {
  soa: SOARecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AgentCountersignModal({
  soa,
  open,
  onOpenChange,
  onSuccess,
}: AgentCountersignModalProps) {
  const [typedSignature, setTypedSignature] = useState("")
  const [initialContactMethod, setInitialContactMethod] = useState(
    soa.initialContactMethod ?? ""
  )
  const [appointmentDate, setAppointmentDate] = useState(
    soa.appointmentDate ?? ""
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!typedSignature.trim()) {
      toast.error("Please type your name to sign")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/soa/${soa.id}/countersign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typedSignature: typedSignature.trim(),
          initialContactMethod: initialContactMethod || null,
          appointmentDate: appointmentDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to countersign")
        return
      }
      toast.success("SOA countersigned successfully")
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to countersign")
    } finally {
      setSubmitting(false)
    }
  }

  const productsDisplay = soa.productsSelected
    .map((p) => PRODUCT_LABELS[p] ?? p)
    .join(", ") || "None"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Countersign Scope of Appointment</DialogTitle>
          <DialogDescription>
            Review the client&apos;s selections and sign to complete the SOA.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm font-medium">Client signed</p>
            <p className="text-sm text-muted-foreground">
              {soa.clientTypedSignature} on{" "}
              {soa.clientSignedAt
                ? new Date(soa.clientSignedAt).toLocaleString()
                : "—"}
            </p>
            <p className="text-sm font-medium mt-2">Products selected</p>
            <p className="text-sm text-muted-foreground">{productsDisplay}</p>
          </div>
          <div className="space-y-2">
            <Label>Initial Contact Method</Label>
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
          <div className="space-y-2">
            <Label>Appointment Date (optional)</Label>
            <DatePicker
              value={appointmentDate}
              onChange={setAppointmentDate}
              placeholder="Add later if needed"
            />
          </div>
          <div className="space-y-2">
            <Label>Type your name to sign</Label>
            <Input
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Your full name"
            />
            {typedSignature && (
              <div
                className="py-2 border-b-2 border-foreground/30"
                style={{
                  fontFamily: "'Dancing Script', cursive",
                  fontSize: "24px",
                }}
              >
                {typedSignature}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!typedSignature.trim() || submitting}
          >
            {submitting ? "Signing…" : "Sign & Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
