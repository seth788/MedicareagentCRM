"use client"

import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface SectionIconItem {
  id: string
  label: string
  icon: React.ElementType
}

interface SectionIconSidebarProps {
  items: SectionIconItem[]
  activeId: string
  basePath: string
  className?: string
}

export function SectionIconSidebar({
  items,
  activeId,
  basePath,
  className,
}: SectionIconSidebarProps) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground",
        "h-full w-12 md:w-14 flex-shrink-0",
        className
      )}
      role="tablist"
      aria-label="Section navigation"
    >
      <nav
        className="flex flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-2 py-3"
        aria-label="Profile sections"
      >
        {items.map(({ id, label, icon: Icon }) => {
          const isActive = activeId === id
          const href = id === "contact" ? basePath : `${basePath}?section=${id}`
          return (
            <Tooltip key={id} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`section-${id}`}
                  id={`tab-${id}`}
                  scroll={false}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                {label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
    </aside>
  )
}
