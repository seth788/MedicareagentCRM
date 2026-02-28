"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  declineSubagencyRequest,
  approveSubagencyRequest,
} from "@/app/actions/subagency-requests-admin"
import { toast } from "sonner"

interface PendingRequest {
  id: string
  requestingUserId: string
  requestingDisplayName: string
  status: string
  requestedAt: string
  placementParentOrgId: string | null
}

interface ParentOrg {
  id: string
  name: string
  depth: number
}

export function SubagencyRequestsCard({
  requests,
  rootOrgId,
  parentOrgs,
}: {
  requests: PendingRequest[]
  rootOrgId: string
  parentOrgs: ParentOrg[]
}) {
  const [declining, setDeclining] = useState<string | null>(null)
  const [approving, setApproving] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})

  if (requests.length === 0) return null

  async function handleDecline(requestId: string) {
    setDeclining(requestId)
    const result = await declineSubagencyRequest(requestId, rootOrgId)
    setDeclining(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Request declined — agent notified")
      window.location.reload()
    }
  }

  async function handleApprove(requestId: string) {
    const parentId = formData[requestId]
    if (!parentId) {
      toast.error("Select placement for the subagency")
      return
    }
    setApproving(requestId)
    const result = await approveSubagencyRequest(requestId, rootOrgId, parentId)
    setApproving(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Request approved — invite sent")
      window.location.reload()
    }
  }

  return (
    <Card className="mt-6 mb-6">
      <CardHeader>
        <CardTitle>Subagency requests</CardTitle>
        <p className="text-sm text-muted-foreground">
          Street-level agents have requested to create subagencies. Approve with placement (the agent will name it when accepting) or decline.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end sm:gap-4"
          >
            <div className="flex-1">
              <p className="font-medium">{r.requestingDisplayName}</p>
              <p className="text-sm text-muted-foreground">
                Requested {new Date(r.requestedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex-1 space-y-1 min-w-[200px]">
              <Label className="text-xs">Placement (parent)</Label>
              <Select
                value={formData[r.id] ?? ""}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, [r.id]: value }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select parent..." />
                </SelectTrigger>
                <SelectContent>
                  {parentOrgs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {"—".repeat(p.depth)}
                      {p.depth > 0 ? " " : ""}
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleApprove(r.id)}
                disabled={approving === r.id}
              >
                {approving === r.id ? "Approving..." : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecline(r.id)}
                disabled={declining === r.id}
              >
                {declining === r.id ? "Declining..." : "Decline"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
