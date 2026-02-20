"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"
import type { Client } from "@/lib/types"

interface MarkAsLeadDialogProps {
  client: Client
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CREATED_BY = "Sarah Mitchell"

export function MarkAsLeadDialog({ client, open, onOpenChange }: MarkAsLeadDialogProps) {
  const { createLeadFromClient, addActivity, flows, getStagesByFlowId, getDefaultFlow, getStageById } = useCRMStore()
  const defaultFlow = getDefaultFlow()
  const [flowId, setFlowId] = useState(defaultFlow?.id ?? "")
  const [stageId, setStageId] = useState("")

  const flowStages = useMemo(() => (flowId ? getStagesByFlowId(flowId) : []), [flowId, getStagesByFlowId])
  const firstStageId = flowStages[0]?.id ?? ""
  const effectiveStageId = stageId || firstStageId

  useEffect(() => {
    if (open) {
      const df = getDefaultFlow()
      setFlowId(df?.id ?? flows[0]?.id ?? "")
      setStageId("")
    }
  }, [open, getDefaultFlow, flows])

  useEffect(() => {
    if (flowId && !flowStages.some((s) => s.id === stageId)) {
      setStageId(flowStages[0]?.id ?? "")
    }
  }, [flowId, flowStages, stageId])

  const handleConfirm = () => {
    if (!effectiveStageId || !flowId) return
    const lead = createLeadFromClient(client.id, flowId, effectiveStageId)
    if (lead) {
      const flow = flows.find((f) => f.id === flowId)
      const flowName = flow?.name ?? flowId
      const stage = getStageById(effectiveStageId)
      const stageName = stage?.name ?? effectiveStageId
      const now = new Date().toISOString()
      addActivity({
        id: `act-${Date.now()}`,
        relatedType: "Client",
        relatedId: client.id,
        type: "note",
        description: `Added to ${flowName} (stage: ${stageName})`,
        createdAt: now,
        createdBy: CREATED_BY,
      })
      goeyToast.success(`Added to ${flowName}`, {
        description: `${lead.firstName} ${lead.lastName} is now in this flow`,
      })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="mark-as-lead-description">
        <DialogHeader>
          <DialogTitle>Mark as lead</DialogTitle>
          <DialogDescription id="mark-as-lead-description">
            Choose the flow and stage where this client should start. They will appear on the board under that stage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-flow">Flow</Label>
            <Select value={flowId} onValueChange={(v) => { setFlowId(v); setStageId("") }}>
              <SelectTrigger id="lead-flow" aria-label="Select flow">
                <SelectValue placeholder="Select flow" />
              </SelectTrigger>
              <SelectContent>
                {flows.sort((a, b) => a.order - b.order).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-stage">Starting stage</Label>
            <Select value={effectiveStageId} onValueChange={setStageId}>
              <SelectTrigger id="lead-stage" aria-label="Select lead stage">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {flowStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!flowId || !effectiveStageId}>Add to leads</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
