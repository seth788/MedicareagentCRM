"use client"

import { useState } from "react"
import {
  removeMember,
  updateMemberDashboardAccess,
  updateMemberRole,
  reactivateMember,
  transferAgent,
} from "@/app/actions/agency-members"
import { createInviteLink, type OrgInviteRole } from "@/app/actions/organization-invites"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { UserPlus, Users, Settings, Plus } from "@/components/icons"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const INVITE_TYPES: {
  value: OrgInviteRole
  title: string
  description: string
  icon: typeof UserPlus
  iconBg: string
  iconColor: string
  buttonLabel: string
}[] = [
  {
    value: "agent",
    title: "Invite for Agent",
    description: "The agent's book of business is accessible to you, and you can see their production.",
    icon: UserPlus,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    buttonLabel: "Copy Link",
  },
  {
    value: "loa_agent",
    title: "Invite for LOA Agent",
    description: "The agent's book of business is accessible to you, but they cannot access yours.",
    icon: UserPlus,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    buttonLabel: "Copy Link",
  },
  {
    value: "community_agent",
    title: "Invite for LOA Community Agent",
    description: "The agent's book of business is accessible to you, and your book of business is accessible to them.",
    icon: UserPlus,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    buttonLabel: "Copy Link",
  },
  {
    value: "agency",
    title: "Invite for Agency",
    description: "For an agent with a downline agency where they can also invite their own downlines.",
    icon: Users,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    buttonLabel: "Copy Link",
  },
  {
    value: "staff",
    title: "Staff Member",
    description: "Non-producing admin who assists with clients and agency.",
    icon: Settings,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    buttonLabel: "Set up",
  },
]

const ROLES = [
  { value: "agent", label: "Agent" },
  { value: "loa_agent", label: "LOA Agent" },
  { value: "community_agent", label: "Community Agent" },
  { value: "agency", label: "Agency" },
  { value: "staff", label: "Staff" },
]

interface MemberRow {
  userId: string
  displayName: string
  email: string
  role: string
  hasDashboardAccess: boolean
  status: string
  acceptedAt: string | null
}

export function MembersPageClient({
  organizationId,
  members,
  isOwner,
  currentUserId,
  subOrgs,
}: {
  organizationId: string
  members: MemberRow[]
  isOwner: boolean
  currentUserId: string
  subOrgs: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null)
  const [transferTarget, setTransferTarget] = useState<MemberRow | null>(null)
  const [transferOrgId, setTransferOrgId] = useState("")
  const [generatingRole, setGeneratingRole] = useState<OrgInviteRole | null>(null)
  const [lastCopiedRole, setLastCopiedRole] = useState<OrgInviteRole | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  async function handleCreateAndCopyLink(role: OrgInviteRole) {
    setGeneratingRole(role)
    const result = await createInviteLink(organizationId, role)
    if (result.error) {
      toast.error(result.error)
      setGeneratingRole(null)
    } else if (result.url) {
      await navigator.clipboard.writeText(result.url)
      toast.success("Copied")
      setGeneratingRole(null)
      setLastCopiedRole(role)
      setTimeout(() => setLastCopiedRole(null), 1000)
    } else {
      setGeneratingRole(null)
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    const result = await removeMember(organizationId, removeTarget.userId)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Member removed")
      router.refresh()
    }
    setRemoveTarget(null)
  }

  async function handleDashboardAccess(member: MemberRow, granted: boolean) {
    const result = await updateMemberDashboardAccess(
      organizationId,
      member.userId,
      granted
    )
    if (result.error) toast.error(result.error)
    else {
      toast.success(granted ? "Dashboard access granted" : "Dashboard access revoked")
      router.refresh()
    }
  }

  async function handleRoleChange(member: MemberRow, newRole: string) {
    const result = await updateMemberRole(organizationId, member.userId, newRole)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Role updated")
      router.refresh()
    }
  }

  async function handleTransfer() {
    if (!transferTarget || !transferOrgId) return
    const result = await transferAgent(organizationId, transferTarget.userId, transferOrgId)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Agent transferred")
      router.refresh()
    }
    setTransferTarget(null)
    setTransferOrgId("")
  }

  async function handleReactivate(member: MemberRow) {
    const result = await reactivateMember(organizationId, member.userId)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Member reactivated")
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invite Links</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create and manage invite links for new members.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Create Invite Link
              </Button>
            </div>
          </CardHeader>

          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogContent className="max-h-[90vh] max-w-md flex flex-col gap-0 p-0">
              <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                <DialogTitle>Create Invite Link</DialogTitle>
                <DialogDescription>
                  Choose the type of invite and copy a link to share.
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
                <div className="space-y-2">
                  {INVITE_TYPES.map((t) => (
                    <div
                      key={t.value}
                      className="flex gap-2 rounded-md border bg-card p-2.5"
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${t.iconBg} ${t.iconColor}`}
                      >
                        <t.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium leading-none">{t.title}</h3>
                        <div className="mt-1 flex items-end justify-between gap-2">
                          <p className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground">
                            {t.description}
                          </p>
                          <Button
                          variant="outline"
                          size="sm"
                          className="h-6 shrink-0 px-1.5 text-[11px]"
                          onClick={() => handleCreateAndCopyLink(t.value)}
                          disabled={!!generatingRole || lastCopiedRole === t.value}
                        >
                          {lastCopiedRole === t.value ? "Copied" : generatingRole === t.value ? "…" : t.buttonLabel}
                        </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Dashboard</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Joined</th>
                  {isOwner && <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{m.displayName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3">
                      {isOwner && m.userId !== currentUserId && m.role !== "owner" ? (
                        <Select
                          value={m.role}
                          onValueChange={(v) => handleRoleChange(m, v)}
                        >
                          <SelectTrigger className="w-[140px]">
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
                      ) : (
                        <span className="text-sm">{m.role.replace(/_/g, " ")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isOwner && m.userId !== currentUserId && m.role !== "owner" ? (
                        <Button
                          variant={m.hasDashboardAccess ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleDashboardAccess(m, !m.hasDashboardAccess)}
                        >
                          {m.hasDashboardAccess ? "Revoke" : "Grant"}
                        </Button>
                      ) : (
                        <span className="text-sm">{m.hasDashboardAccess ? "Yes" : "No"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          m.status === "active" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {m.acceptedAt ? new Date(m.acceptedAt).toLocaleDateString() : "—"}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3 text-right">
                        {m.userId !== currentUserId && m.role !== "owner" && (
                          <div className="flex justify-end gap-2">
                            {m.status === "inactive" ? (
                              <Button size="sm" variant="outline" onClick={() => handleReactivate(m)}>
                                Reactivate
                              </Button>
                            ) : (
                              <>
                                {subOrgs.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setTransferTarget(m)
                                      setTransferOrgId(subOrgs[0]?.id ?? "")
                                    }}
                                  >
                                    Transfer
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRemoveTarget(m)}
                                >
                                  Remove
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">No members</div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeTarget?.displayName} from your agency? You will no
              longer have access to their book of business. Their account and data will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!transferTarget} onOpenChange={() => { setTransferTarget(null); setTransferOrgId("") }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer agent</AlertDialogTitle>
            <AlertDialogDescription>
              Transfer {transferTarget?.displayName} to a sub-agency. Their data will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium">Target sub-agency</label>
            <select
              className="w-full rounded border bg-background px-3 py-2"
              value={transferOrgId}
              onChange={(e) => setTransferOrgId(e.target.value)}
            >
              {subOrgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer}>Transfer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
