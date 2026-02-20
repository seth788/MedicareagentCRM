"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import {
  User,
  Heart,
  ShieldCheck,
  FileText,
  StickyNote,
} from "lucide-react"
import {
  ContactSection,
  HealthSection,
  MedicareSection,
  CoverageSection,
  NotesSection,
} from "@/components/clients/sections"
import type { Client, Activity, Task } from "@/lib/types"
import type { SectionId } from "@/components/clients/sections"

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "contact", label: "Contact", icon: User },
  { id: "health", label: "Health", icon: Heart },
  { id: "medicare", label: "Medicare", icon: ShieldCheck },
  { id: "coverage", label: "Coverage", icon: FileText },
  { id: "notes", label: "Notes & Activity", icon: StickyNote },
]

const VALID_SECTIONS: SectionId[] = ["contact", "health", "medicare", "coverage", "notes"]

function isValidSection(value: string | null): value is SectionId {
  return value !== null && VALID_SECTIONS.includes(value as SectionId)
}

interface ClientTabsProps {
  client: Client
  activities: Activity[]
  tasks: Task[]
  onEditPersonal?: () => void
  onEditContact?: () => void
  onEditMedicare?: () => void
}

export function ClientTabs({
  client,
  activities,
  tasks,
  onEditPersonal,
  onEditContact,
  onEditMedicare,
}: ClientTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const contentRef = useRef<HTMLDivElement>(null)

  const sectionFromUrl = searchParams.get("section")
  const initialSection = isValidSection(sectionFromUrl) ? sectionFromUrl : "contact"

  const [activeSection, setActiveSectionState] = useState<SectionId>(initialSection)

  // Sync state from URL on mount and when URL section changes (e.g. back/forward)
  useEffect(() => {
    const section = searchParams.get("section")
    const next = isValidSection(section) ? section : "contact"
    if (next !== activeSection) {
      setActiveSectionState(next)
    }
  }, [searchParams])

  const setActiveSection = useCallback(
    (section: SectionId) => {
      setActiveSectionState(section)
      const params = new URLSearchParams(searchParams.toString())
      if (section === "contact") {
        params.delete("section")
      } else {
        params.set("section", section)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  // Scroll content area to top when section changes
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [activeSection])

  const sectionProps = {
    client,
    activities,
    tasks,
    onNavigateToSection: setActiveSection,
    onEditPersonal,
    onEditContact,
    onEditMedicare,
  }

  return (
    <div className="w-full">
      {/* Pill-style section nav */}
      <nav
        className="rounded-xl border bg-card p-1.5"
        role="tablist"
        aria-label="Profile sections"
      >
        <div className="flex gap-1 overflow-x-auto scrollbar-thin">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`section-${id}`}
                id={`tab-${id}`}
                onClick={() => setActiveSection(id)}
                className={`
                  flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
                  transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Content area */}
      <div
        ref={contentRef}
        id="section-content"
        className="min-h-[400px] pt-6"
        role="tabpanel"
        aria-labelledby={`tab-${activeSection}`}
      >
        {activeSection === "contact" && (
          <ContactSection {...sectionProps} />
        )}
        {activeSection === "health" && (
          <HealthSection {...sectionProps} />
        )}
        {activeSection === "medicare" && (
          <MedicareSection {...sectionProps} />
        )}
        {activeSection === "coverage" && (
          <CoverageSection {...sectionProps} />
        )}
        {activeSection === "notes" && (
          <NotesSection {...sectionProps} />
        )}
      </div>
    </div>
  )
}
