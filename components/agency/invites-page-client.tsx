"use client"

import { useState } from "react"
import { createInviteWithEmail, type OrgInviteRole } from "@/app/actions/organization-invites"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const ROLES: { value: OrgInviteRole; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "loa_agent", label: "LOA Agent" },
  { value: "community_agent", label: "Community Agent" },
  { value: "agency", label: "Agency" },
  { value: "staff", label: "Staff" },
]

interface PendingInvite {
  id: string
  role: string
  email: string
  status: string
  createdAt: string
}

export function InvitesPageClient({
  organizationId,
  invites,
  roleDescriptions,
}: {
  organizationId: string
  invites: PendingInvite[]
  roleDescriptions: Record<string, string>
}) {
  const [selectedRole, setSelectedRole] = useState<OrgInviteRole>("agent")
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    const result = await createInviteWithEmail(organizationId, selectedRole, email.trim())
    setSending(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Invite sent")
      setEmail("")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send Invite</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="agent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as OrgInviteRole)}>
                <SelectTrigger id="invite-role" className="mt-1">
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
            <Button type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div>
                  <div className="font-medium">{inv.email}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {inv.role.replace(/_/g, " ")} · {inv.status}
                  </div>
                </div>
              </div>
            ))}
            {invites.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">No pending invites</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
