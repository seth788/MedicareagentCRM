"use client"

import * as React from "react"
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
import type { Stage } from "@/lib/types"

interface DeleteStageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stageName: string
  leadCount: number
  otherStages: Stage[]
  onConfirm: (moveToStageId: string) => void
}

export function DeleteStageDialog({
  open,
  onOpenChange,
  stageName,
  leadCount,
  otherStages,
  onConfirm,
}: DeleteStageDialogProps) {
  const [moveToStageId, setMoveToStageId] = React.useState<string>("")

  React.useEffect(() => {
    if (open && otherStages.length > 0) {
      setMoveToStageId(otherStages[0].id)
    }
    if (!open) setMoveToStageId("")
  }, [open, otherStages])

  const handleConfirm = () => {
    if (moveToStageId) {
      onConfirm(moveToStageId)
      onOpenChange(false)
      setMoveToStageId(otherStages[0]?.id ?? "")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="delete-stage-description">
        <DialogHeader>
          <DialogTitle>Delete stage &quot;{stageName}&quot;</DialogTitle>
          <DialogDescription id="delete-stage-description">
            {leadCount} lead{leadCount === 1 ? "" : "s"} {leadCount === 1 ? "is" : "are"} in this stage. Choose a stage to move them to before deleting.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="move-to-stage">Move leads to</Label>
          <Select value={moveToStageId} onValueChange={setMoveToStageId}>
            <SelectTrigger id="move-to-stage" className="w-full">
              <SelectValue placeholder="Select a stage" />
            </SelectTrigger>
            <SelectContent>
              {otherStages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-[40px] w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" className="min-h-[40px] w-full sm:w-auto" onClick={handleConfirm} disabled={!moveToStageId}>
            Delete and move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
