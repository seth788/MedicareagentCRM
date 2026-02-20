"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { GoeyToaster } from "goey-toast"

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
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
