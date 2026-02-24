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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCRMStore } from "@/lib/store"
import { getPreferredOrFirstAddress, getPreferredOrFirstPhone, getPreferredOrFirstEmail } from "@/lib/utils"
import { goeyToast } from "goey-toast"
import type { Stage } from "@/lib/types"
import { Search } from "@/components/icons"


interface AddContactsToFlowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flowId: string
  flowName: string
  stages: Stage[]
}

export function AddContactsToFlowDialog({
  open,
  onOpenChange,
  flowId,
  flowName,
  stages,
}: AddContactsToFlowDialogProps) {
  const { clients, leads, createLeadFromClient, addActivity, getStageById, currentAgent } = useCRMStore()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [stageId, setStageId] = useState(stages[0]?.id ?? "")
  const [search, setSearch] = useState("")

  const firstStageId = stages[0]?.id ?? ""
  const effectiveStageId = stageId || firstStageId

  const alreadyInFlowIds = useMemo(
    () =>
      new Set(
        leads.filter((l) => l.flowId === flowId && l.clientId).map((l) => l.clientId as string)
      ),
    [leads, flowId]
  )

  const availableClients = useMemo(
    () =>
      clients.filter(
        (c) => {
          const phone = getPreferredOrFirstPhone(c)?.number ?? ""
          const email = getPreferredOrFirstEmail(c)?.value ?? ""
          return (
            !alreadyInFlowIds.has(c.id) &&
            (!search ||
              `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
              email.toLowerCase().includes(search.toLowerCase()) ||
              phone.includes(search))
          )
        }
      ),
    [clients, alreadyInFlowIds, search]
  )

  useEffect(() => {
    if (open) {
      setStageId(stages[0]?.id ?? "")
      setSelectedIds(new Set())
      setSearch("")
    }
  }, [open, stages])

  useEffect(() => {
    if (stages.length && !stages.some((s) => s.id === stageId)) {
      setStageId(stages[0]?.id ?? "")
    }
  }, [stages, stageId])

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(availableClients.map((c) => c.id)))
  }

  const clearAll = () => {
    setSelectedIds(new Set())
  }

  const handleConfirm = () => {
    if (!effectiveStageId || selectedIds.size === 0) return
    const toAdd = [...selectedIds].filter((id) => !alreadyInFlowIds.has(id))
    const skipped = selectedIds.size - toAdd.length
    if (toAdd.length === 0) {
      goeyToast.error("No contacts added", {
        description: skipped > 0 ? "Selected contacts are already in this flow." : undefined,
      })
      return
    }
    const stage = getStageById(effectiveStageId)
    const stageName = stage?.name ?? effectiveStageId
    const now = new Date().toISOString()
    let added = 0
    for (const clientId of toAdd) {
      const lead = createLeadFromClient(clientId, flowId, effectiveStageId)
      if (lead) {
        added++
        addActivity({
          id: `act-${Date.now()}-${clientId}-${added}`,
          relatedType: "Client",
          relatedId: clientId,
          type: "note",
          description: `Added to ${flowName} — Stage: ${stageName}`,
          createdAt: now,
          createdBy: currentAgent,
        })
      }
    }
    if (skipped > 0) {
      goeyToast.success(
        added === 1 ? "Contact added to flow" : `Added ${added} contacts to ${flowName}`,
        {
          description: `${skipped} already in this flow and were skipped.`,
        }
      )
    } else {
      goeyToast.success(
        added === 1 ? "Contact added to flow" : `Added ${added} contacts to ${flowName}`,
        {
          description:
            added === 1
              ? "They now appear in this flow."
              : `They now appear in ${flowName}.`,
        }
      )
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="add-contacts-description">
        <DialogHeader>
          <DialogTitle>Add contacts to &quot;{flowName}&quot;</DialogTitle>
          <DialogDescription id="add-contacts-description">
            Select one or more clients to add to this flow. They will start in the stage you choose below. Clients already in this flow are not shown.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-contacts-stage">Stage</Label>
            <Select value={effectiveStageId} onValueChange={setStageId}>
              <SelectTrigger id="add-contacts-stage" aria-label="Select stage">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contacts</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button type="button" onClick={selectAll} className="hover:text-foreground underline">
                Select all
              </button>
              <span>·</span>
              <button type="button" onClick={clearAll} className="hover:text-foreground underline">
                Clear
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span>·</span>
                  <span>{selectedIds.size} selected</span>
                </>
              )}
            </div>
            <ScrollArea className="h-[220px] rounded-md border">
              <div className="p-2 space-y-0.5">
                {availableClients.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {clients.length === 0
                      ? "No clients yet."
                      : alreadyInFlowIds.size === clients.length
                        ? "All clients are already in this flow."
                        : "No matching clients."}
                  </p>
                ) : (
                  availableClients.map((client) => (
                    <label
                      key={client.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIds.has(client.id)}
                        onCheckedChange={() => toggleOne(client.id)}
                        aria-label={`Select ${client.firstName} ${client.lastName}`}
                      />
                      <span className="text-sm truncate">
                        {client.firstName} {client.lastName}
                      </span>
                      {(() => {
                        const addr = getPreferredOrFirstAddress(client)
                        const location = addr ? [addr.city, addr.state].filter(Boolean).join(", ") : ""
                        return location ? (
                          <span className="text-xs text-muted-foreground truncate ml-auto">
                            {location}
                          </span>
                        ) : null
                      })()}
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-[40px] w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="min-h-[40px] w-full sm:w-auto"
            onClick={handleConfirm}
            disabled={!effectiveStageId || selectedIds.size === 0}
          >
            {selectedIds.size === 0
              ? "Add to flow"
              : `Add ${selectedIds.size} contact${selectedIds.size === 1 ? "" : "s"} to flow`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
