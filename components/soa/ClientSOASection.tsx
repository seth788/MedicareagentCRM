"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SendSOAModal } from "./SendSOAModal"
import { AgentCountersignModal } from "./AgentCountersignModal"
import { EditSOAModal } from "./EditSOAModal"
import { SOAHistoryList } from "./SOAHistoryList"
import { Plus, FileText, Signature, Exchange01, Loading01 } from "@/components/icons"
import { toast } from "sonner"
import { useClientSOA } from "@/lib/contexts/client-soa-context"
import type { Client } from "@/lib/types"
import type { SOARecord } from "@/lib/db/soa"
import { getAppUrl } from "@/lib/emails/soa"

interface ClientSOASectionProps {
  client: Client
}

export function ClientSOASection({ client }: ClientSOASectionProps) {
  const soaContext = useClientSOA()
  const [sendOpen, setSendOpen] = useState(false)
  const [countersignSoa, setCountersignSoa] = useState<SOARecord | null>(null)
  const [editSoa, setEditSoa] = useState<SOARecord | null>(null)
  const [voiding, setVoiding] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)

  // Fallback when outside provider (e.g. tests) — would need separate fetch
  const soas = soaContext?.soas ?? []
  const loading = soaContext?.loading ?? false
  const isRefreshing = soaContext?.isRefreshing ?? false
  const lastFetchedAt = soaContext?.lastFetchedAt ?? null
  const refetch = soaContext?.refetch ?? (() => Promise.resolve())

  const pendingSoas = soas.filter((s) =>
    ["sent", "opened", "client_signed"].includes(s.status)
  )

  const copyLink = (soa: SOARecord) => {
    const url = `${getAppUrl()}/soa/sign/${soa.secureToken}`
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy")
    )
  }

  const handleVoid = async (soa: SOARecord) => {
    if (!confirm("Void this SOA? The client will need a new link.")) return
    setVoiding(soa.id)
    try {
      const res = await fetch(`/api/soa/${soa.id}/void`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to void")
        return
      }
      toast.success("SOA voided")
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to void")
    } finally {
      setVoiding(null)
    }
  }

  const handleResend = async (soa: SOARecord) => {
    setResending(soa.id)
    try {
      const res = await fetch(`/api/soa/${soa.id}/resend`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to resend")
        return
      }
      toast.success("SOA resent")
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resend")
    } finally {
      setResending(null)
    }
  }

  return (
    <>
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 py-4 space-y-2">
        <div className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 shrink items-center gap-2.5 text-sm font-semibold sm:text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Signature className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            Scope of Appointment
          </CardTitle>
          <Button onClick={() => setSendOpen(true)} size="sm" className="shrink-0">
            <Plus className="mr-1.5 h-4 w-4" />
            Send SOA
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {loading && !lastFetchedAt
              ? "Loading…"
              : soas.length === 0
                ? "No records"
                : `${soas.length} ${soas.length === 1 ? "record" : "records"}`}
          </span>
          <div className="flex items-center gap-1.5">
            {lastFetchedAt && (
              <span>Updated {formatDistanceToNow(lastFetchedAt, { addSuffix: true })}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-1.5 -mr-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
              disabled={isRefreshing}
              title="Refresh"
            >
              {isRefreshing ? (
                <Loading01 className="h-4 w-4 animate-spin" />
              ) : (
                <Exchange01 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {pendingSoas.length > 1 && (
          <div className="mb-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            There is already a pending SOA for this client. Sending a new one will
            void the previous one.
          </div>
        )}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : soas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No Scope of Appointment forms yet. Send one to get started.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setSendOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Send SOA
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <SOAHistoryList
              soas={soas}
              onEdit={(soa) => setEditSoa(soa)}
              onCountersign={(soa) => setCountersignSoa(soa)}
              onCopyLink={copyLink}
              onResend={handleResend}
              onVoid={handleVoid}
              resending={resending}
              voiding={voiding}
            />
          </div>
        )}
      </CardContent>
    </Card>
      <SendSOAModal
        client={client}
        open={sendOpen}
        onOpenChange={setSendOpen}
        onSuccess={refetch}
      />
      {countersignSoa && (
        <AgentCountersignModal
          soa={countersignSoa}
          open={!!countersignSoa}
          onOpenChange={(open) => !open && setCountersignSoa(null)}
          onSuccess={() => {
            setCountersignSoa(null)
            refetch()
          }}
        />
      )}
      {editSoa && (
        <EditSOAModal
          soa={editSoa}
          open={!!editSoa}
          onOpenChange={(open) => !open && setEditSoa(null)}
          onSuccess={() => {
            setEditSoa(null)
            refetch()
          }}
        />
      )}
    </>
  )
}
