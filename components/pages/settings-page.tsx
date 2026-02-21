"use client"

import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"
import { goeyToast } from "goey-toast"
import { Moon, Sun, Monitor } from "@/components/icons"

export default function SettingsPageInner() {
  const { theme, setTheme } = useTheme()

  const openCmd = () => {
    const fn = (window as unknown as Record<string, unknown>).__openCommandPalette
    if (typeof fn === "function") (fn as () => void)()
  }

  return (
    <>
      <AppHeader title="Settings" onOpenCommandPalette={openCmd} />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-6">
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>First Name</Label>
                    <Input defaultValue="Sarah" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name</Label>
                    <Input defaultValue="Mitchell" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input defaultValue="sarah.mitchell@medicrm.com" type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label>NPN (National Producer Number)</Label>
                  <Input defaultValue="12345678" />
                </div>
                <Button
                  className="w-fit"
                  onClick={() => goeyToast.success("Profile updated")}
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize the look of your workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <Label>Theme</Label>
                  <div className="flex gap-2">
                    {([
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "system", label: "System", icon: Monitor },
                    ] as const).map((opt) => (
                      <Button
                        key={opt.value}
                        variant={theme === opt.value ? "secondary" : "outline"}
                        size="sm"
                        className="gap-2"
                        onClick={() => setTheme(opt.value)}
                      >
                        <opt.icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </Button>
                    ))}
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
