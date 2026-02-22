"use client"

import { useState, useMemo } from "react"
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
import { useCRMStore, generateLeadId } from "@/lib/store"
import type { LeadSource } from "@/lib/types"
import { goeyToast } from "goey-toast"

const sources: LeadSource[] = [
  "Facebook", "Referral", "Website", "Call-in", "Direct Mail", "Event",
]

interface NewLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Default flow to select (e.g. current page flow); falls back to store default */
  defaultFlowId?: string | null
}

export function NewLeadDialog({ open, onOpenChange, defaultFlowId }: NewLeadDialogProps) {
  const { addLead, flows, getStagesByFlowId, getDefaultFlow, currentAgent } = useCRMStore()
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    source: "Website" as LeadSource,
    flowId: "" as string,
    stageId: "" as string,
  })

  const defaultFlow = getDefaultFlow()
  const initialFlowId = defaultFlowId && flows.some((f) => f.id === defaultFlowId) ? defaultFlowId : defaultFlow?.id ?? flows[0]?.id ?? ""
  const effectiveFlowId = form.flowId || initialFlowId
  const flowStages = useMemo(() => (effectiveFlowId ? getStagesByFlowId(effectiveFlowId) : []), [effectiveFlowId, getStagesByFlowId])
  const firstStageId = flowStages[0]?.id ?? ""
  const effectiveStageId = form.stageId || firstStageId


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName) {
      goeyToast.error("First and last name are required")
      return
    }
    if (!effectiveFlowId || !effectiveStageId) {
      goeyToast.error("Select a flow and stage")
      return
    }
    addLead({
      id: generateLeadId(),
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      email: form.email,
      source: form.source,
      assignedTo: currentAgent,
      flowId: effectiveFlowId,
      stageId: effectiveStageId,
      notes: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextFollowUpAt: null,
    })
    goeyToast.success("Lead created", {
      description: `${form.firstName} ${form.lastName} added as a new lead`,
    })
    setForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      source: "Website",
      flowId: "",
      stageId: "",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
          <DialogDescription>
            Add a new lead to your pipeline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="John"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@email.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Flow</Label>
              <Select
                value={effectiveFlowId}
                onValueChange={(v) => setForm({ ...form, flowId: v, stageId: "" })}
              >
                <SelectTrigger><SelectValue placeholder="Select flow" /></SelectTrigger>
                <SelectContent>
                  {flows.sort((a, b) => a.order - b.order).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select
                value={effectiveStageId}
                onValueChange={(v) => setForm({ ...form, stageId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {flowStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select
                value={form.source}
                onValueChange={(v) => setForm({ ...form, source: v as LeadSource })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Lead</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
