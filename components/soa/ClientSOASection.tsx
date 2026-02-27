"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SendSOAModal } from "./SendSOAModal"
import { AgentCountersignModal } from "./AgentCountersignModal"
import { EditSOAModal } from "./EditSOAModal"
import { SOAHistoryList } from "./SOAHistoryList"
import { Plus } from "@/components/icons"
import { toast } from "sonner"
import type { Client } from "@/lib/types"
import type { SOARecord } from "@/lib/db/soa"
import { getAppUrl } from "@/lib/emails/soa"

interface ClientSOASectionProps {
  client: Client
}

export function ClientSOASection({ client }: ClientSOASectionProps) {
  const [soas, setSoas] = useState<SOARecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sendOpen, setSendOpen] = useState(false)
  const [countersignSoa, setCountersignSoa] = useState<SOARecord | null>(null)
  const [editSoa, setEditSoa] = useState<SOARecord | null>(null)
  const [voiding, setVoiding] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)

  const fetchSoas = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/soa?clientId=${client.id}`)
      const data = await res.json()
      if (res.ok && Array.isArray(data.soas)) {
        setSoas(data.soas)
      } else {
        setSoas([])
      }
    } catch {
      setSoas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSoas()
  }, [client.id])

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
      fetchSoas()
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
      fetchSoas()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resend")
    } finally {
      setResending(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold">Scope of Appointment</h3>
        <Button onClick={() => setSendOpen(true)} className="sm:shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Send SOA
        </Button>
      </div>

      {pendingSoas.length > 1 && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          There is already a pending SOA for this client. Sending a new one will
          void the previous one.
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium mb-3">SOA History</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : soas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Scope of Appointment forms yet. Send one to get started.
          </p>
        ) : (
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
        )}
      </div>

      <SendSOAModal
        client={client}
        open={sendOpen}
        onOpenChange={setSendOpen}
        onSuccess={fetchSoas}
      />
      {countersignSoa && (
        <AgentCountersignModal
          soa={countersignSoa}
          open={!!countersignSoa}
          onOpenChange={(open) => !open && setCountersignSoa(null)}
          onSuccess={() => {
            setCountersignSoa(null)
            fetchSoas()
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
            fetchSoas()
          }}
        />
      )}
    </div>
  )
}
