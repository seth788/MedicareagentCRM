"use client"

import { useState } from "react"
import { updateOrganizationName, deleteOrganization } from "@/app/actions/agency-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus } from "@/components/icons"

export function AgencySettingsClient({
  organizationId,
  orgName,
  orgType,
  createdAt,
  parentOrg,
  ownerName,
  subAgencies,
  isOwner,
}: {
  organizationId: string
  orgName: string
  orgType: string
  createdAt: string
  parentOrg: { id: string; name: string } | null
  ownerName: string
  subAgencies: { id: string; name: string; ownerName: string }[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(orgName)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSaveName() {
    if (name.trim() === orgName) return
    setSaving(true)
    const result = await updateOrganizationName(organizationId, name.trim())
    if (result.error) toast.error(result.error)
    else {
      toast.success("Organization name updated")
      router.refresh()
    }
    setSaving(false)
  }

  async function handleDelete() {
    const result = await deleteOrganization(organizationId)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Organization deleted")
      router.push("/dashboard")
    }
    setShowDeleteConfirm(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwner && (
            <div>
              <Label htmlFor="name">Organization name</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-sm"
                />
                <Button onClick={handleSaveName} disabled={saving || name.trim() === orgName}>
                  Save
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Type: </span>
              {orgType.replace(/_/g, " ")}
            </div>
            <div>
              <span className="text-muted-foreground">Created: </span>
              {new Date(createdAt).toLocaleDateString()}
            </div>
            {parentOrg && (
              <div>
                <span className="text-muted-foreground">Parent: </span>
                {parentOrg.name}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Owner: </span>
              {ownerName}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sub-Agencies</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create sub-agencies under your organization. You can choose any agency in your hierarchy as the direct
            upline.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwner && (
            <Button asChild variant="outline" size="sm" className="w-fit gap-2">
              <Link href={`/organization/create?org=${organizationId}`}>
                <Plus className="h-4 w-4" />
                Create Sub-Agency
              </Link>
            </Button>
          )}
          {subAgencies.length > 0 ? (
            <div className="space-y-2">
              {subAgencies.map((s) => (
                <Link
                  key={s.id}
                  href={`/agency?org=${s.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-muted-foreground">Owner: {s.ownerName}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sub-agencies yet.</p>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <p className="text-sm text-muted-foreground">
              Deleting this organization will remove all member associations. Agent data will not be affected.
            </p>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              Delete organization
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all member associations. Agent data will NOT be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
