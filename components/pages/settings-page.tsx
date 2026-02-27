"use client"

import { useEffect, useRef, useState } from "react"
import { useCRMStore, getRefetchCRM } from "@/lib/store"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTheme } from "next-themes"
import { formatPhoneNumber } from "@/lib/utils"
import { toast } from "sonner"
import { Moon, Sun, Monitor } from "@/components/icons"
import { getSettingsProfile, updateProfileSettings } from "@/app/actions/settings"
import { uploadAgentAvatar } from "@/app/actions/agent-avatar"
import type { SettingsProfile as SettingsProfileType } from "@/app/actions/settings"

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.trim().slice(0, 1) ?? ""
  const last = lastName?.trim().slice(0, 1) ?? ""
  if (first || last) return (first + last).toUpperCase()
  return "?"
}

const defaultForm: SettingsProfileType = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  npn: "",
  theme: "light",
  autoIssueApplications: true,
}

export default function SettingsPageInner({
  initialProfile,
}: {
  /** When provided, form is pre-filled and client skip fetch on mount. */
  initialProfile?: SettingsProfileType | null
} = {}) {
  const { setTheme } = useTheme()
  const { setAutoIssueApplications } = useCRMStore()
  const hasInitial = initialProfile != null
  const [profile, setProfile] = useState<SettingsProfileType | null>(hasInitial ? initialProfile : null)
  const [loading, setLoading] = useState(!hasInitial)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarTooltipOpen, setAvatarTooltipOpen] = useState(false)
  const [form, setForm] = useState<SettingsProfileType>(hasInitial ? initialProfile! : defaultForm)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarButtonRef = useRef<HTMLButtonElement>(null)
  const avatarTooltipSuppressRef = useRef(false)

  useEffect(() => {
    if (hasInitial) return
    getSettingsProfile().then((data) => {
      if (data) {
        setProfile(data)
        setForm(data)
      }
      setLoading(false)
    })
  }, [hasInitial])

  const openCmd = () => {
    const fn = (window as unknown as Record<string, unknown>).__openCommandPalette
    if (typeof fn === "function") (fn as () => void)()
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await updateProfileSettings({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        npn: form.npn,
        theme: form.theme,
        autoIssueApplications: form.autoIssueApplications,
      })
      setProfile({ ...form })
      setAutoIssueApplications(form.autoIssueApplications)
      toast.success("Profile updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleThemeChange = (value: "light" | "dark" | "system") => {
    setForm((f) => ({ ...f, theme: value }))
    setTheme(value)
  }

  const handleAvatarClick = () => {
    setAvatarTooltipOpen(false)
    avatarTooltipSuppressRef.current = true
    fileInputRef.current?.click()
    setTimeout(() => {
      avatarTooltipSuppressRef.current = false
    }, 800)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.set("file", file)
    const result = await uploadAgentAvatar(formData)
    setUploading(false)
    e.target.value = ""
    if (result.error) {
      toast.error(result.error)
    } else if (result.imageUrl) {
      toast.success("Profile photo updated")
      setProfile((p) => (p ? { ...p, avatarUrl: result.imageUrl! } : p))
      setForm((f) => ({ ...f, avatarUrl: result.imageUrl! }))
      getRefetchCRM()?.()
    }
  }

  const savedThemeRef = useRef(profile?.theme ?? "light")
  useEffect(() => {
    savedThemeRef.current = profile?.theme ?? "light"
  }, [profile?.theme])
  useEffect(() => {
    return () => {
      if (form.theme !== savedThemeRef.current) {
        setTheme(savedThemeRef.current)
      }
    }
  }, [form.theme, setTheme])

  const savedProfile = profile ?? defaultForm
  const hasProfileChanges =
    form.firstName !== savedProfile.firstName ||
    form.lastName !== savedProfile.lastName ||
    form.phone !== savedProfile.phone ||
    form.npn !== savedProfile.npn ||
    form.theme !== savedProfile.theme ||
    form.autoIssueApplications !== savedProfile.autoIssueApplications
  const canSave = hasProfileChanges && !saving

  return (
    <>
      <AppHeader title="Settings" onOpenCommandPalette={openCmd} />
      <div className="flex-1 overflow-auto overflow-x-hidden">
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Manage your account preferences and application settings.
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
                <CardDescription>Your agent profile information.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading profile…</p>
                ) : (
                  <>
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip
                          open={avatarTooltipOpen}
                          onOpenChange={(open) => {
                            if (open) {
                              const isHoveringAvatar = avatarButtonRef.current?.matches(":hover") ?? false
                              if (avatarTooltipSuppressRef.current || !isHoveringAvatar) {
                                // Ignore auto-open events when returning from native file picker.
                                avatarTooltipSuppressRef.current = false
                                return
                              }
                            }
                            setAvatarTooltipOpen(open)
                          }}
                        >
                          <TooltipTrigger asChild>
                            <button
                              ref={avatarButtonRef}
                              type="button"
                              onClick={handleAvatarClick}
                              disabled={uploading}
                              className="relative flex shrink-0 overflow-hidden rounded-full ring-2 ring-muted transition-opacity hover:opacity-90 disabled:opacity-70"
                              aria-label="Change profile photo"
                            >
                              <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                                <AvatarImage src={form.avatarUrl ?? undefined} alt="" />
                                <AvatarFallback className="bg-primary text-xl font-medium text-primary-foreground">
                                  {getInitials(form.firstName, form.lastName)}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{uploading ? "Uploading…" : "Change photo"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={handleAvatarChange}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Profile picture</p>
                        <p className="text-xs text-muted-foreground">
                          Click the avatar to upload a new photo. JPEG, PNG, or WebP. Max 2MB.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>First Name</Label>
                        <Input
                          value={form.firstName}
                          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                          placeholder="First name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Last Name</Label>
                        <Input
                          value={form.lastName}
                          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        value={form.email}
                        readOnly
                        type="email"
                        className="bg-muted"
                        title="Email is managed by your account sign-in."
                      />
                      <p className="text-xs text-muted-foreground">
                        Email is managed by your account sign-in.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input
                        value={formatPhoneNumber(form.phone)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                          setForm((f) => ({ ...f, phone: formatPhoneNumber(digits) }))
                        }}
                        placeholder="(555) 123-4567"
                        type="tel"
                        inputMode="numeric"
                        maxLength={14}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used for Scope of Appointment and client communications.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>NPN (National Producer Number)</Label>
                      <Input
                        value={form.npn}
                        onChange={(e) => setForm((f) => ({ ...f, npn: e.target.value }))}
                        placeholder="NPN"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Appearance</Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {([
                          { value: "light", label: "Light", icon: Sun },
                          { value: "dark", label: "Dark", icon: Moon },
                          { value: "system", label: "System", icon: Monitor },
                        ] as const).map((opt) => (
<Button
                      key={opt.value}
                      variant={form.theme === opt.value ? "secondary" : "outline"}
                      size="sm"
                      className="min-h-[40px] gap-2"
                      onClick={() => handleThemeChange(opt.value)}
                    >
                            <opt.icon className="h-3.5 w-3.5" />
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Click to preview; save to apply to your profile.
                      </p>
                    </div>
                    <Button
                      className="min-h-[40px] w-full sm:w-fit"
                      onClick={handleSaveProfile}
                      disabled={!canSave}
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applications</CardTitle>
                <CardDescription>
                  How pending applications are marked as issued.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-1.5">
                  <Label>Pending applications</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically mark pending applications as issued when their
                    effective date is reached, or mark them manually.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant={
                        form.autoIssueApplications ? "secondary" : "outline"
                      }
                      size="sm"
                      className="min-h-[40px] gap-2"
                      onClick={() =>
                        setForm((f) => ({ ...f, autoIssueApplications: true }))
                      }
                    >
                      Automatic
                    </Button>
                    <Button
                      variant={
                        !form.autoIssueApplications ? "secondary" : "outline"
                      }
                      size="sm"
                      className="min-h-[40px] gap-2"
                      onClick={() =>
                        setForm((f) => ({ ...f, autoIssueApplications: false }))
                      }
                    >
                      Manual
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Configure how you receive alerts.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">New lead alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Get notified when a new lead is assigned to you
                    </p>
                  </div>
                  <Badge variant="secondary">On</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Task reminders</p>
                    <p className="text-xs text-muted-foreground">
                      Reminders for upcoming and overdue tasks
                    </p>
                  </div>
                  <Badge variant="secondary">On</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Turning 65 alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Alerts when clients are approaching their 65th birthday
                    </p>
                  </div>
                  <Badge variant="secondary">On</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono text-foreground">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Environment</span>
                  <Badge variant="outline" className="text-xs">Demo</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
