"use client"

import { useState, useEffect } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, Pencil, Share05, Exchange01, CancelSquare } from "@/components/icons"
import { SOAActivityTimeline } from "./SOAActivityTimeline"
import { SOAPDFActions } from "./SOAPDFActions"
import type { SOARecord } from "@/lib/db/soa"
import type { SOAAuditEntry } from "@/lib/db/soa"

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "warning" }> = {
  draft: { label: "Draft", variant: "secondary" },
  sent: { label: "Sent", variant: "secondary" },
  opened: { label: "Opened by Client", variant: "default" },
  client_signed: { label: "Awaiting Your Signature", variant: "warning" },
  completed: { label: "Completed", variant: "default" },
  expired: { label: "Expired", variant: "destructive" },
  voided: { label: "Voided", variant: "secondary" },
}

const PRODUCT_ABBREV: Record<string, string> = {
  part_d: "Part D",
  part_c: "Part C",
  dental_vision_hearing: "D/V/H",
  hospital_indemnity: "Hospital",
  medigap: "Medigap",
}

interface SOAHistoryListProps {
  soas: SOARecord[]
  onEdit?: (soa: SOARecord) => void
  onCountersign?: (soa: SOARecord) => void
  onCopyLink?: (soa: SOARecord) => void
  onResend?: (soa: SOARecord) => void
  onVoid?: (soa: SOARecord) => void
  resending?: string | null
  voiding?: string | null
}

export function SOAHistoryList({
  soas,
  onEdit,
  onCountersign,
  onCopyLink,
  onResend,
  onVoid,
  resending,
  voiding,
}: SOAHistoryListProps) {
  return (
    <div className="space-y-2">
      {soas.map((soa) => (
        <SOAHistoryItem
          key={soa.id}
          soa={soa}
          onEdit={onEdit}
          onCountersign={onCountersign}
          onCopyLink={onCopyLink}
          onResend={onResend}
          onVoid={onVoid}
          resending={resending}
          voiding={voiding}
        />
      ))}
    </div>
  )
}

function SOAHistoryItem({
  soa,
  onEdit,
  onCountersign,
  onCopyLink,
  onResend,
  onVoid,
  resending,
  voiding,
}: {
  soa: SOARecord
  onEdit?: (soa: SOARecord) => void
  onCountersign?: (soa: SOARecord) => void
  onCopyLink?: (soa: SOARecord) => void
  onResend?: (soa: SOARecord) => void
  onVoid?: (soa: SOARecord) => void
  resending?: string | null
  voiding?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [auditEntries, setAuditEntries] = useState<SOAAuditEntry[]>([])

  useEffect(() => {
    if (open) {
      fetch(`/api/soa/${soa.id}/audit`)
        .then((r) => r.json())
        .then((data) => setAuditEntries(data.entries ?? []))
        .catch(() => setAuditEntries([]))
    }
  }, [open, soa.id])

  const statusInfo = STATUS_LABELS[soa.status] ?? {
    label: soa.status,
    variant: "secondary" as const,
  }
  const productsDisplay = soa.productsSelected
    .map((p) => PRODUCT_ABBREV[p] ?? p)
    .join(", ") || "—"
  const createdDate = soa.createdAt
    ? new Date(soa.createdAt).toLocaleDateString()
    : "—"

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardContent className="flex flex-col gap-3 py-4 cursor-pointer hover:bg-muted/50">
            {/* Top row: chevron + date/products (content never overlaps) */}
            <div className="flex items-start gap-3 min-w-0">
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              )}
              <div className="text-left min-w-0 flex-1 overflow-hidden">
                <p className="text-sm font-medium">{createdDate}</p>
                <p className="text-xs text-muted-foreground break-words">{productsDisplay}</p>
              </div>
            </div>
            {/* Bottom row: status badge + action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pl-7">
              <Badge variant={statusInfo.variant} className="shrink-0">
                {statusInfo.label}
              </Badge>
              <div
                className="flex flex-wrap items-center gap-2 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
              {soa.status === "client_signed" && onCountersign && (
                <Button size="sm" onClick={() => onCountersign(soa)}>
                  Countersign
                </Button>
              )}
              {["sent", "opened"].includes(soa.status) && (
                <>
                  {onResend && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResend(soa)}
                      disabled={resending === soa.id}
                    >
                      <Exchange01 className="h-4 w-4 mr-1" />
                      Resend
                    </Button>
                  )}
                  {onVoid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onVoid(soa)}
                      disabled={voiding === soa.id}
                    >
                      <CancelSquare className="h-4 w-4 mr-1" />
                      Void
                    </Button>
                  )}
                </>
              )}
              {soa.status === "completed" && (
                <>
                  <SOAPDFActions soaId={soa.id} />
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(soa)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </>
              )}
              {["sent", "opened"].includes(soa.status) && onCopyLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopyLink(soa)}
                >
                  <Share05 className="h-4 w-4 mr-1" />
                  Copy Link
                </Button>
              )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 border-t max-h-72 overflow-y-auto">
            <SOAActivityTimeline entries={auditEntries} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
