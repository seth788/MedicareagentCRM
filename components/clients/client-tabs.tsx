"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import {
  User,
  Heart,
  FileText,
  StickyNote2,
  SecurityLock,
  ChevronDown,
} from "@/components/icons"
import { Signature } from "@/components/icons"
import {
  ContactSection,
  HealthSection,
  MedicareSection,
  CoverageSection,
  NotesSection,
  SOASection,
} from "@/components/clients/sections"
import type { Client, Activity, Task } from "@/lib/types"
import type { SectionId } from "@/components/clients/sections"

export const CLIENT_SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "contact", label: "Contact", icon: User },
  { id: "health", label: "Health", icon: Heart },
  { id: "coverage", label: "Coverage", icon: FileText },
  { id: "notes", label: "Notes & Activity", icon: StickyNote2 },
  { id: "medicare", label: "Medicare", icon: SecurityLock },
  { id: "soa", label: "Scope of Appointment", icon: Signature },
]

const VALID_SECTIONS: SectionId[] = ["contact", "health", "medicare", "coverage", "notes", "soa"]

function isValidSection(value: string | null): value is SectionId {
  return value !== null && VALID_SECTIONS.includes(value as SectionId)
}

interface ClientTabsProps {
  client: Client
  activities: Activity[]
  tasks: Task[]
  onEditPersonal?: () => void
  onEditContact?: () => void
  onEditAddresses?: () => void
  onEditMedicare?: () => void
  /** When true, section is controlled by parent and desktop pill nav is hidden (icon sidebar used instead) */
  activeSection?: SectionId
  onSectionChange?: (section: SectionId) => void
}

export function ClientTabs({
  client,
  activities,
  tasks,
  onEditPersonal,
  onEditContact,
  onEditAddresses,
  onEditMedicare,
  activeSection: controlledSection,
  onSectionChange,
}: ClientTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sectionFromUrl = searchParams.get("section")
  const initialSection = isValidSection(sectionFromUrl) ? sectionFromUrl : "contact"

  const [internalSection, setInternalSection] = useState<SectionId>(initialSection)
  const isControlled = controlledSection !== undefined && onSectionChange !== undefined
  const activeSection = isControlled ? controlledSection! : internalSection

  const setActiveSection = useCallback(
    (section: SectionId) => {
      if (!isControlled) {
        setInternalSection(section)
        const params = new URLSearchParams(searchParams.toString())
        if (section === "contact") params.delete("section")
        else params.set("section", section)
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      }
      onSectionChange?.(section)
    },
    [pathname, router, searchParams, isControlled, onSectionChange]
  )

  // Sync state from URL on mount and when URL section changes (e.g. back/forward)
  useEffect(() => {
    const section = searchParams.get("section")
    const next = isValidSection(section) ? section : "contact"
    if (next !== activeSection) {
      if (!isControlled) setInternalSection(next)
      onSectionChange?.(next)
    }
  }, [searchParams, activeSection, isControlled, onSectionChange])

  const sectionProps = {
    client,
    activities,
    tasks,
    sectionBasePath: `/clients/${client.id}`,
    onNavigateToSection: setActiveSection,
    onEditPersonal,
    onEditContact,
    onEditAddresses,
    onEditMedicare,
  }

  return (
    <div className="w-full">
      {/* Mobile: dropdown section selector */}
      <div className="sm:hidden">
        <div className="relative rounded-xl border bg-card">
          {(() => {
            const active = CLIENT_SECTIONS.find((s) => s.id === activeSection) ?? CLIENT_SECTIONS[0]
            const ActiveIcon = active.icon
            return (
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2 pl-4">
                <ActiveIcon className="h-4 w-4 text-primary" />
              </div>
            )
          })()}
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as SectionId)}
            aria-label="Select profile section"
            className="w-full min-h-[48px] appearance-none rounded-xl bg-transparent py-3 pl-10 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CLIENT_SECTIONS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Desktop: pill-style section nav (hidden when using icon sidebar) */}
      {!isControlled && (
      <nav
        className="hidden sm:block rounded-xl border bg-card p-1.5"
        role="tablist"
        aria-label="Profile sections"
      >
        <div className="flex flex-wrap gap-1">
          {CLIENT_SECTIONS.map(({ id, label, icon: Icon }) => {
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
                  flex min-h-[40px] items-center justify-start gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
                  transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
      )}

      {/* Content area */}
      <div
        id="section-content"
        className="min-h-[400px] pt-4"
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
        {activeSection === "soa" && (
          <SOASection {...sectionProps} />
        )}
      </div>
    </div>
  )
}
