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
import { toast } from "sonner"

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
  const { addLead, addActivity, flows, getStagesByFlowId, getStageById, getDefaultFlow, currentAgent } = useCRMStore()
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
      toast.error("First and last name are required")
      return
    }
    if (!effectiveFlowId || !effectiveStageId) {
      toast.error("Select a flow and stage")
      return
    }
    const leadId = generateLeadId()
    const now = new Date().toISOString()
    addLead({
      id: leadId,
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
      createdAt: now,
      updatedAt: now,
      nextFollowUpAt: null,
    })
    const flow = flows.find((f) => f.id === effectiveFlowId)
    const flowName = flow?.name ?? effectiveFlowId
    const stage = getStageById(effectiveStageId)
    const stageName = stage?.name ?? effectiveStageId
    addActivity({
      id: `act-${Date.now()}-${leadId}`,
      relatedType: "Lead",
      relatedId: leadId,
      type: "flow",
      description: `Added to ${flowName} (stage: ${stageName})`,
      createdAt: now,
      createdBy: currentAgent,
    })
    toast.success("Lead created", {
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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-4 pr-12 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>New Lead</DialogTitle>
          <DialogDescription>
            Add a new lead to your pipeline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
          <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t px-4 py-4 pt-2 sm:px-6">
            <Button type="button" variant="outline" className="min-h-[40px] w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-[40px] w-full sm:w-auto">Create Lead</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
