"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AgencySidebar } from "@/components/agency/agency-sidebar"
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
      <SidebarInset className="overflow-auto">{children}</SidebarInset>
      <Toaster position="bottom-right" />
    </SidebarProvider>
  )
}
