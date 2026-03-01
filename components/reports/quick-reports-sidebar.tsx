"use client"

import { useState } from "react"
import Link from "next/link"
import { FilterHorizontal, Trash2 } from "@/components/icons"
import { QUICK_REPORT_PRESETS, presetToFilters } from "@/lib/report-filters"
import type { ReportFilter } from "@/lib/report-filters"
import type { SavedReport } from "@/lib/db/saved-reports"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

export interface ReportLink {
  title: string
  href?: string
  /** When provided, renders a button instead of a link; reportType is passed to the callback */
  reportType?: string
  onClick?: (reportType: string) => void
  icon: React.ComponentType<{ className?: string }>
}

type FilterDef = { field: string; label: string; type: string; group?: string; options?: readonly { value: string; label: string }[] }

interface QuickReportsSidebarProps {
  savedReports: SavedReport[]
  onSelectPreset: (filters: ReportFilter[]) => void
  onSavedReportDeleted?: () => void
  /** Optional report links (e.g. Production, Roster, Renewals) shown at top of sidebar */
  reportLinks?: ReportLink[]
  /** When provided (e.g. agency), use these defs when building preset filter labels */
  filterDefinitions?: FilterDef[]
}

export function QuickReportsSidebar({
  savedReports,
  onSelectPreset,
  onSavedReportDeleted,
  reportLinks = [],
  filterDefinitions,
}: QuickReportsSidebarProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/saved-reports/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteId(null)
      onSavedReportDeleted?.()
      toast.success("Report removed from Quick Reports")
    } catch {
      toast.error("Failed to delete report")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Quick Reports</h3>
      <ul className="space-y-1">
        {reportLinks.map((link) =>
          link.onClick && link.reportType ? (
            <li key={link.reportType}>
              <button
                type="button"
                onClick={() => link.onClick?.(link.reportType!)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <link.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {link.title}
              </button>
            </li>
          ) : (
            <li key={link.href ?? link.title}>
              <Link
                href={link.href ?? "#"}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <link.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {link.title}
              </Link>
            </li>
          )
        )}
        {/* Filter presets and saved reports only for CRM (when no reportLinks). Agency has its own saved reports. */}
        {reportLinks.length === 0 && (
          <>
            {QUICK_REPORT_PRESETS.map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => onSelectPreset(presetToFilters(preset))}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <FilterHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {preset.label}
                </button>
              </li>
            ))}
          </>
        )}
        {savedReports.length > 0 && (
          <>
            <li className="pt-2">
              <span className="text-xs font-medium text-muted-foreground">Saved</span>
            </li>
            {savedReports.map((report) => (
              <li key={report.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onSelectPreset(
                      presetToFilters(
                        { id: report.id, filters: report.filters },
                        reportLinks.length > 0 ? filterDefinitions : undefined
                      )
                    )
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <FilterHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{report.name}</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                  aria-label="Remove from Quick Reports"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteId(report.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </li>
            ))}
          </>
        )}
      </ul>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Quick Reports?</AlertDialogTitle>
            <AlertDialogDescription>
              This report will be removed from your Quick Reports list. You can save it again
              later from the Report Builder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
