"use client"

import { useEffect, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Moon, Sun, Monitor } from "@/components/icons"
import { getSettingsProfile, updateProfileSettings } from "@/app/actions/settings"
import type { SettingsProfile as SettingsProfileType } from "@/app/actions/settings"

const defaultForm: SettingsProfileType = {
  firstName: "",
  lastName: "",
  email: "",
  npn: "",
  theme: "light",
}

export default function SettingsPageInner({
  initialProfile,
}: {
  /** When provided, form is pre-filled and client skip fetch on mount. */
  initialProfile?: SettingsProfileType | null
} = {}) {
  const { setTheme } = useTheme()
  const hasInitial = initialProfile != null
  const [profile, setProfile] = useState<SettingsProfileType | null>(hasInitial ? initialProfile : null)
  const [loading, setLoading] = useState(!hasInitial)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SettingsProfileType>(hasInitial ? initialProfile! : defaultForm)

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
        npn: form.npn,
        theme: form.theme,
      })
      setProfile({ ...form })
      toast.success("Profile updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleThemeChange = async (value: "light" | "dark" | "system") => {
    setForm((f) => ({ ...f, theme: value }))
    setTheme(value)
    try {
      await updateProfileSettings({
        firstName: form.firstName,
        lastName: form.lastName,
        npn: form.npn,
        theme: value,
      })
      setProfile((p) => (p ? { ...p, theme: value } : p))
    } catch {
      toast.error("Could not save theme")
    }
  }

  const savedProfile = profile ?? defaultForm
  const hasProfileChanges =
    form.firstName !== savedProfile.firstName ||
    form.lastName !== savedProfile.lastName ||
    form.npn !== savedProfile.npn ||
    form.theme !== savedProfile.theme
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
                        Saved with your profile and applied when you sign in.
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
