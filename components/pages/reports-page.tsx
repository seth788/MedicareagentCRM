"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { getRefetchCRM } from "@/lib/store"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { ReportBuilder } from "@/components/reports/report-builder"
import { ReportResultsTable } from "@/components/reports/report-results-table"
import { QuickReportsSidebar } from "@/components/reports/quick-reports-sidebar"
import { useCRMStore } from "@/lib/store"
import { getReportRows, reportRowsToCsv } from "@/lib/db/reports"
import {
  getPharmacyOptionsFromClients,
  getRxOptionsFromClients,
  getSourceOptionsFromClients,
  getHealthTrackerOptionsFromClients,
  getLanguageOptionsFromClients,
  getCityOptionsFromClients,
  getStateOptionsFromClients,
  getZipOptionsFromClients,
  getCountyOptionsFromClients,
  getCarrierOptionsFromClients,
  type ReportFilter,
} from "@/lib/report-filters"
import type { SavedReport } from "@/lib/db/saved-reports"
import { Share05 } from "@/components/icons"
import { Card, CardContent } from "@/components/ui/card"

export function ReportsPageInner() {
  const { clients, hydrated } = useCRMStore()
  const [filters, setFilters] = useState<ReportFilter[]>([])
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])

  const fetchSavedReports = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-reports")
      if (res.ok) {
        const data = await res.json()
        setSavedReports(data)
      }
    } catch {
      // ignore
    }
  }, [])
  const [filtersChangedSinceRun, setFiltersChangedSinceRun] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  const handleFiltersChange = (newFilters: ReportFilter[]) => {
    setFilters(newFilters)
    setFiltersChangedSinceRun(true)
  }

  useEffect(() => {
    if (hydrated && clients.length === 0) {
      getRefetchCRM()?.()
    }
  }, [hydrated, clients.length])

  useEffect(() => {
    fetchSavedReports()
  }, [fetchSavedReports])

  const rows = useMemo(() => {
    if (!hasRun && filters.length > 0) return []
    return getReportRows(clients, filters)
  }, [clients, filters, hasRun])

  const pharmacyOptions = useMemo(() => getPharmacyOptionsFromClients(clients), [clients])
  const rxOptions = useMemo(() => getRxOptionsFromClients(clients), [clients])
  const sourceOptions = useMemo(() => getSourceOptionsFromClients(clients), [clients])
  const healthTrackerOptions = useMemo(() => getHealthTrackerOptionsFromClients(clients), [clients])
  const languageOptions = useMemo(() => getLanguageOptionsFromClients(clients), [clients])
  const cityOptions = useMemo(() => getCityOptionsFromClients(clients), [clients])
  const stateOptions = useMemo(() => getStateOptionsFromClients(clients), [clients])
  const zipOptions = useMemo(() => getZipOptionsFromClients(clients), [clients])
  const countyOptions = useMemo(() => getCountyOptionsFromClients(clients), [clients])
  const carrierOptions = useMemo(() => getCarrierOptionsFromClients(clients), [clients])

  const runReport = () => {
    setHasRun(true)
    setFiltersChangedSinceRun(false)
  }

  const handleSelectPreset = (presetFilters: ReportFilter[]) => {
    setFilters(presetFilters)
    setFiltersChangedSinceRun(false)
    setHasRun(true)
  }

  const handleExportCsv = async () => {
    const idsToExport = selectedIds.size > 0 ? [...selectedIds] : rows.map((r) => r.id)
    if (idsToExport.length === 0) return

    setExporting(true)
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: idsToExport }),
      })
      if (!res.ok) throw new Error("Export log failed")

      const rowsToExport = selectedIds.size > 0
        ? rows.filter((r) => selectedIds.has(r.id))
        : rows
      const csv = reportRowsToCsv(rowsToExport)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("Export failed", e)
    } finally {
      setExporting(false)
    }
  }

  const openCmd = () => {
    const fn = (window as unknown as Record<string, unknown>).__openCommandPalette
    if (typeof fn === "function") (fn as () => void)()
  }

  return (
    <>
      <AppHeader title="Reports" onOpenCommandPalette={openCmd}>
        <Button
          size="sm"
          className="min-h-[40px]"
          onClick={handleExportCsv}
          disabled={rows.length === 0 || exporting}
        >
          <Share05 className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </AppHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col gap-6 border-b pb-4 min-[1090px]:flex-row">
          <Card className="min-w-0 flex-1">
            <CardContent className="p-4">
              <ReportBuilder
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onRunReport={runReport}
                onReportSaved={fetchSavedReports}
                runReportDisabled={filters.length === 0 || !filtersChangedSinceRun}
                pharmacyOptions={pharmacyOptions}
                rxOptions={rxOptions}
                sourceOptions={sourceOptions}
                healthTrackerOptions={healthTrackerOptions}
                languageOptions={languageOptions}
                cityOptions={cityOptions}
                stateOptions={stateOptions}
                zipOptions={zipOptions}
                countyOptions={countyOptions}
                carrierOptions={carrierOptions}
              />
            </CardContent>
          </Card>
          <Card className="w-full shrink-0 min-[1090px]:w-64">
            <CardContent className="p-4">
              <QuickReportsSidebar
                savedReports={savedReports}
                onSelectPreset={handleSelectPreset}
                onSavedReportDeleted={fetchSavedReports}
              />
            </CardContent>
          </Card>
        </div>

        <main className="min-h-0 min-w-0 flex-1 overflow-auto">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filters.length === 0 || hasRun
                ? `${rows.length} result${rows.length === 1 ? "" : "s"}`
                : "Run a report or choose a quick report to see results"}
            </p>
          </div>
          <ReportResultsTable
            rows={rows}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </main>
      </div>
    </>
  )
}
