"use client"

import { useState } from "react"
import { createInviteLink, type OrgInviteRole } from "@/app/actions/organization-invites"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Share05 } from "@/components/icons"

const ROLES: { value: OrgInviteRole; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "loa_agent", label: "LOA Agent" },
  { value: "community_agent", label: "Community Agent" },
  { value: "agency", label: "Agency" },
  { value: "staff", label: "Staff" },
]

interface InviteRow {
  id: string
  role: string
  url: string
}

export function InvitesPageClient({
  organizationId,
  invites,
  roleDescriptions,
}: {
  organizationId: string
  invites: InviteRow[]
  roleDescriptions: Record<string, string>
}) {
  const [selectedRole, setSelectedRole] = useState<OrgInviteRole>("agent")
  const [generating, setGenerating] = useState(false)
  const [inviteList, setInviteList] = useState(invites)

  async function handleGenerate() {
    setGenerating(true)
    const result = await createInviteLink(organizationId, selectedRole)
    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      toast.success("Link copied to clipboard")
      await navigator.clipboard.writeText(result.url)
    }
    setGenerating(false)
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    toast.success("Copied to clipboard")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate New Link</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-2 block text-sm font-medium">Role</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as OrgInviteRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleDescriptions[selectedRole] && (
              <p className="mt-1 text-xs text-muted-foreground">{roleDescriptions[selectedRole]}</p>
            )}
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Creating..." : "Generate Link"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Invites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inviteList.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div>
                  <div className="font-medium">{inv.role.replace(/_/g, " ")}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="truncate max-w-md text-sm text-muted-foreground">{inv.url}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyUrl(inv.url)}
                      title="Copy"
                    >
                      <Share05 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {inviteList.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">No invite links yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
