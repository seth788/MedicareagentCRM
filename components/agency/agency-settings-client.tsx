"use client"

import { useState, useRef } from "react"
import { updateOrganizationName, deleteOrganization, uploadOrganizationLogo, deleteOrganizationLogo, updateShowLogoToDownline } from "@/app/actions/agency-settings"
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
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function AgencySettingsClient({
  organizationId,
  orgName,
  orgType,
  createdAt,
  parentOrg,
  ownerName,
  logoUrl,
  showLogoToDownline: initialShowLogoToDownline,
  isOwner,
}: {
  organizationId: string
  orgName: string
  orgType: string
  createdAt: string
  parentOrg: { id: string; name: string } | null
  ownerName: string
  logoUrl: string | null
  showLogoToDownline: boolean
  isOwner: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(orgName)
  const [logo, setLogo] = useState<string | null>(logoUrl)
  const [showLogoToDownline, setShowLogoToDownline] = useState(initialShowLogoToDownline)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingLogo, setDeletingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.set("file", file)
    const result = await uploadOrganizationLogo(organizationId, formData)
    if (result.error) toast.error(result.error)
    else if (result.imageUrl) {
      setLogo(result.imageUrl)
      toast.success("Logo updated")
      router.refresh()
    }
    setUploading(false)
    e.target.value = ""
  }

  async function handleDeleteLogo() {
    if (!logo) return
    setDeletingLogo(true)
    const result = await deleteOrganizationLogo(organizationId)
    if (result.error) toast.error(result.error)
    else {
      setLogo(null)
      toast.success("Logo deleted")
      router.refresh()
    }
    setDeletingLogo(false)
  }

  async function handleShowLogoToDownlineChange(checked: boolean) {
    setShowLogoToDownline(checked)
    const result = await updateShowLogoToDownline(organizationId, checked)
    if (result.error) {
      setShowLogoToDownline(!checked)
      toast.error(result.error)
    } else {
      toast.success(checked ? "Logo will display to your downline" : "Logo hidden from downline")
      router.refresh()
    }
  }

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-muted transition-colors hover:border-muted-foreground/50 hover:bg-muted/50 disabled:opacity-70"
                aria-label="Upload logo"
              >
                <div className="flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
                  {logo ? (
                    <img src={logo} alt="Agency logo" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-3xl font-medium text-muted-foreground">
                      {orgName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleLogoChange}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium">Agency logo</p>
                <p className="text-xs text-muted-foreground">
                  Click to upload a logo. JPEG, PNG, or WebP. Max 2MB.
                </p>
                {logo ? (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="show-logo-downline"
                        checked={showLogoToDownline}
                        onCheckedChange={handleShowLogoToDownlineChange}
                      />
                      <Label htmlFor="show-logo-downline" className="text-sm font-normal cursor-pointer">
                        Show logo to downline
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleDeleteLogo}
                      disabled={deletingLogo}
                    >
                      {deletingLogo ? "Deleting…" : "Delete logo"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pt-1">
                    Upload a logo to display it to your downline. Until then, your upline&apos;s logo may show if they have this option enabled.
                  </p>
                )}
              </div>
            </div>
          )}
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
