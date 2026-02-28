"use client"

import { useState } from "react"
import {
  removeMember,
  updateMemberDashboardAccess,
  updateMemberRole,
  reactivateMember,
  transferAgent,
} from "@/app/actions/agency-members"
import {
  createInviteWithEmail,
  revokeInvite,
  type OrgInviteRole,
} from "@/app/actions/organization-invites"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, UserPlus, Users, Settings, ChevronLeft, MoreHorizontal } from "@/components/icons"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const ROLES: { value: OrgInviteRole; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "loa_agent", label: "LOA Agent" },
  { value: "community_agent", label: "Community Agent" },
  { value: "agency", label: "Agency" },
  { value: "staff", label: "Staff" },
]

const INVITE_TYPES: {
  value: OrgInviteRole
  title: string
  description: string
  icon: typeof UserPlus
  iconBg: string
  iconColor: string
}[] = [
  {
    value: "agent",
    title: "Agent",
    description: "The agent's book of business is accessible to you, and you can see their production.",
    icon: UserPlus,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  {
    value: "loa_agent",
    title: "LOA Agent",
    description: "The agent's book of business is accessible to you, but they cannot access yours.",
    icon: UserPlus,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    value: "community_agent",
    title: "LOA Community Agent",
    description: "The agent's book of business is accessible to you, and your book of business is accessible to them.",
    icon: UserPlus,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    value: "agency",
    title: "Agency",
    description: "For an agent with a downline agency where they can also invite their own downlines.",
    icon: Users,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    value: "staff",
    title: "Staff Member",
    description: "Non-producing admin who assists with clients and agency.",
    icon: Settings,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
]

interface PendingInvite {
  id: string
  role: string
  email: string
  status: string
  createdAt: string
  organizationId: string
  organizationName?: string
}

interface MemberRow {
  userId: string
  displayName: string
  email: string
  role: string
  hasDashboardAccess: boolean
  status: string
  acceptedAt: string | null
  isSubAgencyOwner?: boolean
  subAgencyName?: string
  organizationId?: string
  organizationName?: string
}

type TableRow =
  | { type: "member"; data: MemberRow }
  | { type: "invite"; data: PendingInvite }

export function MembersPageClient({
  organizationId,
  members,
  invites,
  isOwner,
  currentUserId,
  subOrgs,
  targetOrgsForInvite,
}: {
  organizationId: string
  members: MemberRow[]
  invites: PendingInvite[]
  isOwner: boolean
  currentUserId: string
  subOrgs: { id: string; name: string }[]
  targetOrgsForInvite: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null)
  const [transferTarget, setTransferTarget] = useState<MemberRow | null>(null)
  const [transferOrgId, setTransferOrgId] = useState("")
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedRoleForInvite, setSelectedRoleForInvite] = useState<OrgInviteRole | null>(null)
  const [inviteTargetOrgId, setInviteTargetOrgId] = useState(organizationId)
  const [inviteEmail, setInviteEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<PendingInvite | null>(null)

  // Merge members and invites into single table; invites first (newest), then members (newest first)
  const sortedInvites = [...invites].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const sortedMembers = [...members].sort((a, b) => {
    const aDate = a.acceptedAt ? new Date(a.acceptedAt).getTime() : 0
    const bDate = b.acceptedAt ? new Date(b.acceptedAt).getTime() : 0
    return bDate - aDate
  })
  const tableRows: TableRow[] = [
    ...sortedInvites.map((inv) => ({ type: "invite" as const, data: inv })),
    ...sortedMembers.map((m) => ({ type: "member" as const, data: m })),
  ]

  function handleCloseInviteModal(open: boolean) {
    if (!open) {
      setCreateModalOpen(false)
      setSelectedRoleForInvite(null)
      setInviteTargetOrgId(organizationId)
      setInviteEmail("")
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !selectedRoleForInvite) return
    setSending(true)
    const result = await createInviteWithEmail(inviteTargetOrgId, selectedRoleForInvite, inviteEmail.trim())
    setSending(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Invite sent")
      setInviteEmail("")
      setSelectedRoleForInvite(null)
      setCreateModalOpen(false)
      router.refresh()
    }
  }

  async function handleRevokeInvite() {
    if (!revokeTarget) return
    const result = await revokeInvite(revokeTarget.organizationId, revokeTarget.id)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Invite revoked")
      setRevokeTarget(null)
      router.refresh()
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    const memberOrgId = removeTarget.organizationId ?? organizationId
    const result = await removeMember(memberOrgId, removeTarget.userId)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Member removed")
      router.refresh()
    }
    setRemoveTarget(null)
  }

  async function handleDashboardAccess(member: MemberRow, granted: boolean) {
    const memberOrgId = member.organizationId ?? organizationId
    const result = await updateMemberDashboardAccess(
      memberOrgId,
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
    const memberOrgId = member.organizationId ?? organizationId
    const result = await updateMemberRole(memberOrgId, member.userId, newRole)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Role updated")
      router.refresh()
    }
  }

  async function handleTransfer() {
    if (!transferTarget || !transferOrgId) return
    const memberOrgId = transferTarget.organizationId ?? organizationId
    const result = await transferAgent(memberOrgId, transferTarget.userId, transferOrgId)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Agent transferred")
      router.refresh()
    }
    setTransferTarget(null)
    setTransferOrgId("")
  }

  async function handleReactivate(member: MemberRow) {
    const memberOrgId = member.organizationId ?? organizationId
    const result = await reactivateMember(memberOrgId, member.userId)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Member reactivated")
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invite Members</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Send invites by email. Each invite is a unique link sent to the recipient.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setInviteTargetOrgId(organizationId)
                    setCreateModalOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Send Invite
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Dialog open={createModalOpen} onOpenChange={handleCloseInviteModal}>
            <DialogContent className="max-h-[90vh] max-w-md flex flex-col gap-0 p-0">
              {selectedRoleForInvite === null ? (
                <>
                  <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                    <DialogTitle>Send Invite</DialogTitle>
                    <DialogDescription>
                      Choose the type of invite and send a unique link to the recipient&apos;s email.
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
                                onClick={() => setSelectedRoleForInvite(t.value)}
                              >
                                Send Link
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 mb-1 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSelectedRoleForInvite(null)
                        setInviteEmail("")
                      }}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Back
                    </Button>
                    <DialogTitle>
                      Send invite as{" "}
                      {INVITE_TYPES.find((t) => t.value === selectedRoleForInvite)?.title ?? selectedRoleForInvite}
                    </DialogTitle>
                    <DialogDescription>
                      Enter the recipient&apos;s email. A unique invite link will be sent to them.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSendInvite} className="px-6 pb-6">
                    <div className="space-y-4 pt-2">
                      {targetOrgsForInvite.length > 1 && (
                        <div>
                          <Label htmlFor="invite-target-org">Add to agency</Label>
                          <Select
                            value={inviteTargetOrgId}
                            onValueChange={setInviteTargetOrgId}
                          >
                            <SelectTrigger id="invite-target-org" className="mt-1">
                              <SelectValue placeholder="Select agency" />
                            </SelectTrigger>
                            <SelectContent>
                              {targetOrgsForInvite.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div>
                        <Label htmlFor="invite-email">Email</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="agent@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="mt-1"
                          required
                          autoFocus
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleCloseInviteModal(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={sending}>
                          {sending ? "Sending…" : "Send Invite"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke invite</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to revoke the invite sent to {revokeTarget?.email}? The link
                  will no longer work.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRevokeInvite}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Revoke
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
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
                {tableRows.map((row) =>
                  row.type === "invite" ? (
                    <tr key={`invite-${row.data.id}`} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-muted-foreground">—</td>
                      <td className="px-4 py-3 text-sm">{row.data.email}</td>
                      <td className="px-4 py-3 text-sm">
                        {row.data.role.replace(/_/g, " ")}
                        {row.data.organizationId !== organizationId && row.data.organizationName && (
                          <span className="ml-1 text-muted-foreground">→ {row.data.organizationName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">—</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            row.data.status === "opened"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {row.data.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">—</td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRevokeTarget(row.data)}
                              >
                                Revoke invite
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ) : (
                    (() => {
                      const m = row.data
                      const isAgent = ["agent", "loa_agent", "community_agent", "agency"].includes(m.role)
                      const isSubAgencyOwner = "isSubAgencyOwner" in m && m.isSubAgencyOwner
                      return (
                        <tr key={m.userId} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">
                            {m.displayName}
                            {isSubAgencyOwner && m.subAgencyName && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({m.subAgencyName})
                              </span>
                            )}
                            {!isSubAgencyOwner && m.organizationId !== organizationId && m.organizationName && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({m.organizationName})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{m.email}</td>
                          <td className="px-4 py-3">
                            {isSubAgencyOwner ? (
                              <span className="text-sm">
                                Sub-Agency Owner
                              </span>
                            ) : isOwner && m.userId !== currentUserId && m.role !== "owner" ? (
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
                            {isSubAgencyOwner ? (
                              <span className="text-sm text-muted-foreground">—</span>
                            ) : isOwner && m.userId !== currentUserId && m.role !== "owner" ? (
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
                                m.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-muted text-muted-foreground"
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
                              {!isSubAgencyOwner && m.userId !== currentUserId && m.role !== "owner" && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {m.status === "inactive" && (
                                      <DropdownMenuItem onClick={() => handleReactivate(m)}>
                                        Reactivate
                                      </DropdownMenuItem>
                                    )}
                                    {m.status === "active" && subOrgs.length > 0 && isAgent && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setTransferTarget(m)
                                          setTransferOrgId(subOrgs[0]?.id ?? "")
                                        }}
                                      >
                                        Transfer
                                      </DropdownMenuItem>
                                    )}
                                    {(m.status === "inactive" ||
                                      (m.status === "active" && subOrgs.length > 0 && isAgent)) && (
                                      <DropdownMenuSeparator />
                                    )}
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setRemoveTarget(m)}
                                    >
                                      {isAgent ? "Release from agency" : "Remove"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })()
                  )
                )}
              </tbody>
            </table>
          </div>
          {tableRows.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">No members or invites</div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeTarget && ["agent", "loa_agent", "community_agent", "agency"].includes(removeTarget.role)
                ? "Release from agency"
                : "Remove member"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to{" "}
              {removeTarget && ["agent", "loa_agent", "community_agent", "agency"].includes(removeTarget.role)
                ? "release"
                : "remove"}{" "}
              {removeTarget?.displayName} from your agency? You will no longer have access to their book of
              business. Their account and data will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeTarget && ["agent", "loa_agent", "community_agent", "agency"].includes(removeTarget.role)
                ? "Release"
                : "Remove"}
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
