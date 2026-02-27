"use client"

import type { ReactNode } from "react"
import type { SOAAuditEntry } from "@/lib/db/soa"

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  sent: "Sent",
  delivery_failed: "Delivery Failed",
  opened: "Opened by Client",
  client_signed: "Client Signed",
  agent_countersigned: "Agent Countersigned",
  pdf_generated: "PDF Generated",
  edited: "Edited",
  voided: "Voided",
  expired: "Expired",
  resent: "Resent",
}

const PRODUCT_LABELS: Record<string, string> = {
  part_d: "Part D",
  part_c: "Part C",
  dental_vision_hearing: "Dental/Vision/Hearing",
  hospital_indemnity: "Hospital Indemnity",
  medigap: "Medigap",
}

function formatMetadata(action: string, metadata: Record<string, unknown>): ReactNode {
  if (action === "sent") {
    const to = metadata.to as string | undefined
    const method = metadata.delivery_method as string | undefined
    if (to) {
      return (
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          <p>Sent to {to}</p>
          {method && (
            <p className="capitalize">Delivery: {method.replace(/_/g, " ")}</p>
          )}
        </div>
      )
    }
  }
  if (action === "client_signed") {
    const signerType = metadata.signer_type as string | undefined
    const products = metadata.products_selected as string[] | undefined
    return (
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        {signerType && (
          <p className="capitalize">
            Signed by: {signerType.replace(/_/g, " ")}
          </p>
        )}
        {products?.length && (
          <p>
            Products selected:{" "}
            {products
              .map((p) => PRODUCT_LABELS[p] ?? p.replace(/_/g, " "))
              .join(", ")}
          </p>
        )}
      </div>
    )
  }
  return null
}

interface SOAActivityTimelineProps {
  entries: SOAAuditEntry[]
}

export function SOAActivityTimeline({ entries }: SOAActivityTimelineProps) {
  if (!entries.length) return null
  return (
    <div className="relative space-y-4 pl-4 border-l-2 border-muted pt-4">
      {entries.map((e) => {
        const formatted = e.metadata && ["sent", "client_signed"].includes(e.action)
          ? formatMetadata(e.action, e.metadata as Record<string, unknown>)
          : null
        const hasMetadata = e.metadata && Object.keys(e.metadata).length > 0
        const showRaw = hasMetadata && !formatted

        return (
          <div key={e.id} className="relative -left-4">
            <div className="absolute left-0 w-2 h-2 rounded-full bg-primary -translate-x-[5px] mt-1.5" />
            <div className="pl-4">
              <p className="text-sm font-medium">
                {ACTION_LABELS[e.action] ?? e.action}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </p>
              {formatted}
              {showRaw && (
                <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto">
                  {JSON.stringify(e.metadata, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
