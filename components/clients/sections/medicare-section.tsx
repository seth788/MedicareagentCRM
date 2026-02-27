"use client"

import { useState } from "react"
import { format } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import { Eye, ViewOff, ShieldAlert } from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import type { SectionProps } from "./types"

const MASKED_PLACEHOLDER = "••••••••••" // Shown when client has MBI on file but not revealed

export function MedicareSection({ client, onEditMedicare }: SectionProps) {
  const [showMedicare, setShowMedicare] = useState(false)
  const [revealDialog, setRevealDialog] = useState(false)
  const [revealedMbi, setRevealedMbi] = useState<string | null>(null)
  const [loadingReveal, setLoadingReveal] = useState(false)
  const hasMedicareNumber = client.hasMedicareNumber ?? false

  const displayValue = !hasMedicareNumber
    ? "Not on file"
    : showMedicare && revealedMbi
      ? revealedMbi
      : MASKED_PLACEHOLDER

  async function handleConfirmReveal() {
    setRevealDialog(false)
    setLoadingReveal(true)
    const toastId = toast.loading("Decrypting Medicare number…")
    try {
      const res = await fetch(`/api/clients/${client.id}/reveal-mbi`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to load")
      }
      const data = (await res.json()) as { medicareNumber: string }
      setRevealedMbi(data.medicareNumber ?? "")
      setShowMedicare(true)
      toast.success("Medicare number revealed", { id: toastId })
    } catch {
      setRevealedMbi(null)
      setShowMedicare(false)
      toast.error("Failed to load Medicare number", { id: toastId })
    } finally {
      setLoadingReveal(false)
    }
  }

  function handleHide() {
    setShowMedicare(false)
    setRevealedMbi(null)
  }

  return (
    <div className="w-full">
      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 border-b bg-muted/30 py-4">
          <div className="flex items-center gap-2.5">
            <CardTitle className="flex items-center gap-2.5 text-sm font-semibold sm:text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
              Medicare Information
            </CardTitle>
          </div>
          {onEditMedicare && (
            <Button variant="outline" size="sm" onClick={onEditMedicare}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-3.5">
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Protected Health Information (PHI)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This section contains sensitive data protected under HIPAA. Data is encrypted at
                  rest and in transit, with role-based access controls and full audit logging.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y rounded-lg border">
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span className="text-sm text-muted-foreground">Medicare Number</span>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm font-medium text-foreground">
                  {displayValue}
                </code>
                {hasMedicareNumber && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={loadingReveal}
                    onClick={() => {
                      if (showMedicare) {
                        handleHide()
                      } else {
                        setRevealDialog(true)
                      }
                    }}
                  >
                    {showMedicare ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <ViewOff className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showMedicare ? "Hide" : "Reveal"} Medicare number
                    </span>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span className="text-sm text-muted-foreground">Part A Effective Date</span>
              <span className="text-sm text-foreground">
                {client.partAEffectiveDate
                  ? format(parseLocalDate(client.partAEffectiveDate), "MM/dd/yyyy")
                  : "Not on file"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span className="text-sm text-muted-foreground">Part B Effective Date</span>
              <span className="text-sm text-foreground">
                {client.partBEffectiveDate
                  ? format(parseLocalDate(client.partBEffectiveDate), "MM/dd/yyyy")
                  : "Not on file"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={revealDialog} onOpenChange={setRevealDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reveal Sensitive Data</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to reveal the Medicare number for{" "}
              <span className="font-medium text-foreground">
                {client.firstName} {client.lastName}
              </span>
              . This action will be logged in the audit trail. Make sure you are in a private and
              secure environment before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReveal}>
              Reveal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
