"use client"

import { Search } from "@/components/icons"
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
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b bg-card px-3 py-2 sm:gap-3 sm:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      {breadcrumb && (
        <>
          {breadcrumb}
          <Separator orientation="vertical" className="h-5" />
        </>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</h1>
      </div>
      <div className="ml-auto flex min-h-[40px] shrink-0 items-center gap-2">
        {children}
        <Button
          variant="outline"
          size="icon"
          className="min-h-[40px] min-w-[40px] shrink-0 text-muted-foreground lg:min-h-0 lg:min-w-0 lg:size-auto lg:px-3 lg:py-1.5"
          onClick={onOpenCommandPalette}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden text-xs lg:inline lg:ml-1">Search...</span>
          <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:flex">
            {"Ctrl+K"}
          </kbd>
        </Button>
      </div>
    </header>
  )
}
