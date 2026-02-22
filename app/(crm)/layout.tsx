"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AuthSync } from "@/components/auth-sync"
import { CrmDataLoader } from "@/components/crm-data-loader"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { GoeyToaster } from "goey-toast"

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AuthSync />
      <AppSidebar />
      <SidebarInset>
        <CrmDataLoader>{children}</CrmDataLoader>
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
