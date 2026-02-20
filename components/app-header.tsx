"use client"

import { Search } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

interface AppHeaderProps {
  title: string
  onOpenCommandPalette?: () => void
  /** Rendered between sidebar trigger and title (e.g. "Back to Clients" link) */
  breadcrumb?: React.ReactNode
  children?: React.ReactNode
}

export function AppHeader({ title, onOpenCommandPalette, breadcrumb, children }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      {breadcrumb && (
        <>
          {breadcrumb}
          <Separator orientation="vertical" className="h-5" />
        </>
      )}
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 text-muted-foreground md:flex"
          onClick={onOpenCommandPalette}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            {"Ctrl+K"}
          </kbd>
        </Button>
      </div>
    </header>
  )
}
