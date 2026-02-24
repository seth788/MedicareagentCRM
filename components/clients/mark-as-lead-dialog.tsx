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


export function MarkAsLeadDialog({ client, open, onOpenChange }: MarkAsLeadDialogProps) {
  const { leads, createLeadFromClient, addActivity, flows, getStagesByFlowId, getDefaultFlow, getStageById, currentAgent } =
    useCRMStore()

  const availableFlows = useMemo(
    () =>
      flows
        .filter((f) => !leads.some((l) => l.clientId === client.id && l.flowId === f.id))
        .sort((a, b) => a.order - b.order),
    [flows, leads, client.id]
  )

  const defaultFlow = getDefaultFlow()
  const [flowId, setFlowId] = useState(defaultFlow?.id ?? "")
  const [stageId, setStageId] = useState("")

  const flowStages = useMemo(() => (flowId ? getStagesByFlowId(flowId) : []), [flowId, getStagesByFlowId])
  const firstStageId = flowStages[0]?.id ?? ""
  const effectiveStageId = stageId || firstStageId

  useEffect(() => {
    if (open) {
      const first = availableFlows.find((f) => f.id === (defaultFlow?.id ?? flows[0]?.id)) ?? availableFlows[0]
      setFlowId(first?.id ?? "")
      setStageId("")
    }
  }, [open, defaultFlow?.id, flows, availableFlows])

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
        createdBy: currentAgent,
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
          <DialogTitle>Add to flow</DialogTitle>
          <DialogDescription id="mark-as-lead-description">
            {availableFlows.length === 0
              ? "This client is already in every flow."
              : "Choose a flow and stage. They will appear on the board under that stage."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {availableFlows.length > 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="lead-flow">Flow</Label>
                <Select value={flowId} onValueChange={(v) => { setFlowId(v); setStageId("") }}>
                  <SelectTrigger id="lead-flow" aria-label="Select flow">
                    <SelectValue placeholder="Select flow" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFlows.map((f) => (
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
            </>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-[40px] w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="min-h-[40px] w-full sm:w-auto" onClick={handleConfirm} disabled={!flowId || !effectiveStageId || availableFlows.length === 0}>
            Add to flow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
