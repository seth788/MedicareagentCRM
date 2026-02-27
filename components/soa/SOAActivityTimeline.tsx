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

const EDIT_FIELD_LABELS: Record<string, string> = {
  agent_name: "Agent name",
  appointment_date: "Appointment date",
  initial_contact_method: "Initial contact method",
}

function formatMetadata(action: string, metadata: Record<string, unknown>): ReactNode {
  if (action === "edited") {
    const fieldsChanged = metadata.fields_changed as Record<
      string,
      { before: unknown; after: unknown }
    > | undefined
    if (fieldsChanged && Object.keys(fieldsChanged).length > 0) {
      return (
        <div className="text-xs text-muted-foreground mt-1 space-y-2">
          {Object.entries(fieldsChanged).map(([key, change]) => {
            const label = EDIT_FIELD_LABELS[key] ?? key.replace(/_/g, " ")
            const before = change.before ?? "—"
            const after = change.after ?? "—"
            return (
              <div key={key} className="flex flex-wrap gap-x-1.5">
                <span className="capitalize font-medium">{label}:</span>
                <span className="line-through opacity-75">{String(before)}</span>
                <span aria-hidden>→</span>
                <span>{String(after)}</span>
              </div>
            )
          })}
        </div>
      )
    }
  }
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

function formatGenericMetadata(metadata: Record<string, unknown>): ReactNode {
  return (
    <dl className="space-y-1">
      {Object.entries(metadata).map(([key, value]) => {
        const label = key.replace(/_/g, " ")
        const display =
          value === null || value === undefined
            ? "—"
            : typeof value === "object" && !Array.isArray(value) && value !== null
              ? Object.entries(value as Record<string, unknown>)
                  .map(([k, v]) => `${k}: ${v ?? "—"}`)
                  .join(", ")
              : String(value)
        return (
          <div key={key} className="flex gap-2">
            <dt className="font-medium capitalize shrink-0">{label}:</dt>
            <dd className="min-w-0 break-words">{display}</dd>
          </div>
        )
      })}
    </dl>
  )
}

interface SOAActivityTimelineProps {
  entries: SOAAuditEntry[]
}

export function SOAActivityTimeline({ entries }: SOAActivityTimelineProps) {
  if (!entries.length) return null
  return (
    <div className="relative space-y-4 pl-4 border-l-2 border-muted pt-4">
      {entries.map((e) => {
        const formatted = e.metadata && ["edited", "sent", "client_signed"].includes(e.action)
          ? formatMetadata(e.action, e.metadata as Record<string, unknown>)
          : null
        const hasMetadata = e.metadata && Object.keys(e.metadata).length > 0
        const showFallback = hasMetadata && !formatted

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
              {showFallback && (
                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                  {formatGenericMetadata(e.metadata as Record<string, unknown>)}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
