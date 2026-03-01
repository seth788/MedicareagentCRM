"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AgencySidebar } from "@/components/agency/agency-sidebar"
import { AgencyHeader } from "@/components/agency/agency-header"
import { CommandPalette } from "@/components/command-palette"
import { Toaster } from "@/components/ui/sonner"

export function AgencyLayoutClient({
  orgs,
  user,
  children,
}: {
  orgs: { id: string; name: string }[]
  user: { displayName: string; email: string; avatarUrl: string | null }
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AgencySidebar orgs={orgs} user={user} />
      <SidebarInset>
        <AgencyHeader />
        <div className="flex-1 overflow-auto overflow-x-hidden">{children}</div>
      </SidebarInset>
      <CommandPalette />
      <Toaster position="bottom-right" />
    </SidebarProvider>
  )
}
