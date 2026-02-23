"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AuthSync } from "@/components/auth-sync"
import { CrmDataLoader } from "@/components/crm-data-loader"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { GoeyToaster } from "goey-toast"
import type { HydratePayload } from "@/app/actions/crm-data"

export function CrmLayoutClient({
  children,
  initialData,
}: {
  children: React.ReactNode
  /** Pre-fetched CRM data from server; when provided, CrmDataLoader skips client fetch. */
  initialData?: HydratePayload | null
}) {
  return (
    <SidebarProvider>
      <AuthSync />
      <AppSidebar />
      <SidebarInset>
        <CrmDataLoader initialData={initialData}>{children}</CrmDataLoader>
      </SidebarInset>
      <CommandPalette />
      <GoeyToaster
        position="bottom-right"
        spring={false}
        expand={false}
        gap={6}
        visibleToasts={5}
      />
    </SidebarProvider>
  )
}
