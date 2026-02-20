"use client"

import { useState } from "react"
import { format } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import { Eye, EyeOff, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import type { SectionProps } from "./types"

function maskMedicare(num: string, show: boolean) {
  if (!num) return "Not on file"
  if (show) return num
  return num.replace(/[A-Z0-9]/gi, (_, i: number) => (i > num.length - 5 ? _ : "*"))
}

export function MedicareSection({ client }: SectionProps) {
  const [showMedicare, setShowMedicare] = useState(false)
  const [revealDialog, setRevealDialog] = useState(false)

  return (
    <div className="max-w-2xl">
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Medicare Information
            </CardTitle>
            <Badge
              variant="outline"
              className="border-warning/30 bg-warning/10 text-warning text-xs"
            >
              Sensitive Data
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-0">
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Protected Health Information (PHI)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This section contains sensitive data protected under HIPAA. In production, data
                  would be encrypted at rest and in transit, with role-based access controls and
                  full audit logging.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Medicare Number</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="font-mono text-sm text-foreground">
                  {maskMedicare(client.medicareNumber, showMedicare)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    if (showMedicare) {
                      setShowMedicare(false)
                    } else {
                      setRevealDialog(true)
                    }
                  }}
                >
                  {showMedicare ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showMedicare ? "Hide" : "Reveal"} Medicare number
                  </span>
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Part A Effective Date</p>
              <p className="mt-2 text-sm text-foreground">
                {client.partAEffectiveDate
                  ? format(parseLocalDate(client.partAEffectiveDate), "MMMM d, yyyy")
                  : "Not on file"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Part B Effective Date</p>
              <p className="mt-2 text-sm text-foreground">
                {client.partBEffectiveDate
                  ? format(parseLocalDate(client.partBEffectiveDate), "MMMM d, yyyy")
                  : "Not on file"}
              </p>
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
            <AlertDialogAction
              onClick={() => {
                setShowMedicare(true)
                setRevealDialog(false)
              }}
            >
              Reveal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
