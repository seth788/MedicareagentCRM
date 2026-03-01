"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ReportBuilder } from "@/components/reports/report-builder"
import { ReportResultsTable } from "@/components/reports/report-results-table"
import { QuickReportsSidebar } from "@/components/reports/quick-reports-sidebar"
import type { ReportLink } from "@/components/reports/quick-reports-sidebar"
import { AgencyReportTable } from "@/components/agency/agency-report-table"
import { ProductionReportTable } from "@/components/agency/production-report-table"
import { reportRowsToCsv } from "@/lib/db/reports"
import type { ReportRow } from "@/lib/db/reports"
import type { ReportFilter } from "@/lib/report-filters"
import { AGENCY_FILTER_FIELD_DEFINITIONS } from "@/lib/agency-report-filters"
import type { SavedReport } from "@/lib/db/saved-reports"
import { Share05, BarChart3, Users, FileText } from "@/components/icons"
import { Card, CardContent } from "@/components/ui/card"
import {
  runAgencyReport,
  getAgencyReportFilterOptions,
  fetchProductionReport,
  fetchRosterReport,
  fetchClientsReport,
} from "@/app/actions/agency-reports"
import {
  PRODUCTION_COLUMNS,
  ROSTER_COLUMNS,
  CLIENTS_COLUMNS,
  AGENCY_SALES_COLUMNS,
  genericRowsToCsv,
  type PolicySalesRow,
} from "@/lib/agency-report-columns"

export type AgencyReportType = "custom" | "production" | "roster" | "clients"

export function AgencyReportsPageClient({ orgId }: { orgId: string }) {
  const reportLinks: ReportLink[] = [
    { title: "Production Report", reportType: "production", onClick: handleQuickReportClick, icon: BarChart3 },
    { title: "Agent Roster", reportType: "roster", onClick: handleQuickReportClick, icon: Users },
    { title: "Client Summary", reportType: "clients", onClick: handleQuickReportClick, icon: FileText },
  ]

  const [filters, setFilters] = useState<ReportFilter[]>([])
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [filtersChangedSinceRun, setFiltersChangedSinceRun] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [reportType, setReportType] = useState<AgencyReportType>("custom")
  const [customReportMode, setCustomReportMode] = useState<"client" | "policy">("client")
  const [customRows, setCustomRows] = useState<ReportRow[]>([])
  const [policyRows, setPolicyRows] = useState<PolicySalesRow[]>([])
  const [genericRows, setGenericRows] = useState<Record<string, unknown>[]>([])
  const [genericTotals, setGenericTotals] = useState<Record<string, unknown> | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [running, setRunning] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [sourceOptions, setSourceOptions] = useState<string[]>([])
  const [carrierOptions, setCarrierOptions] = useState<string[]>([])
  const [planNameOptions, setPlanNameOptions] = useState<string[]>([])
  const [agencyOptions, setAgencyOptions] = useState<string[]>([])
  const [productionYear, setProductionYear] = useState(() => new Date().getFullYear())

  function handleQuickReportClick(type: string) {
    setReportType(type as AgencyReportType)
    runQuickReport(type as AgencyReportType)
  }

  async function runQuickReport(type: AgencyReportType, productionYearOverride?: number) {
    if (type === "custom") return
    setRunning(true)
    setGenericRows([])
    setGenericTotals(null)
    try {
      const now = new Date()
      const startDefault = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const endDefault = new Date().toISOString().slice(0, 10)
      let result: { rows: Record<string, unknown>[]; error?: string } | null = null
      if (type === "production") {
        const year = productionYearOverride ?? productionYear
        result = await fetchProductionReport(orgId, { year })
      } else if (type === "roster") {
        result = await fetchRosterReport(orgId, {})
      } else if (type === "clients") {
        result = await fetchClientsReport(orgId, { start: startDefault, end: endDefault })
      }

      if (result?.rows) {
        setGenericRows(result.rows)
        if (type === "clients" && result.rows.length > 0) {
          const totals = (result.rows as { total?: number; new?: number; active?: number; lead?: number; inactive?: number }[]).reduce(
            (acc, r) => ({
              agentName: "Total",
              agencyName: "",
              total: (acc.total ?? 0) + (r.total ?? 0),
              new: (acc.new ?? 0) + (r.new ?? 0),
              active: (acc.active ?? 0) + (r.active ?? 0),
              lead: (acc.lead ?? 0) + (r.lead ?? 0),
              inactive: (acc.inactive ?? 0) + (r.inactive ?? 0),
            }),
            {} as Record<string, unknown>
          )
          setGenericTotals(totals)
        } else {
          setGenericTotals(null)
        }
        setHasRun(true)
      }
      if (result?.error) console.error(result.error)
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    getAgencyReportFilterOptions(orgId).then((opts) => {
      if (opts && !opts.error) {
        setSourceOptions(opts.sourceOptions)
        setCarrierOptions(opts.carrierOptions)
        setPlanNameOptions(opts.planNameOptions)
        setAgencyOptions(opts.agencyOptions)
      }
    })
  }, [orgId])

  const fetchSavedReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/saved-reports?org=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setSavedReports(data)
      }
    } catch {
      // ignore
    }
  }, [orgId])

  useEffect(() => {
    fetchSavedReports()
  }, [fetchSavedReports])

  const handleFiltersChange = (newFilters: ReportFilter[]) => {
    setFilters(newFilters)
    if (newFilters.length === 0) {
      setHasRun(false)
      setCustomRows([])
      setPolicyRows([])
      setCustomReportMode("client")
      setFiltersChangedSinceRun(false)
    } else {
      setFiltersChangedSinceRun(true)
    }
  }

  const runReport = useCallback(async () => {
    if (filters.length === 0) return
    setReportType("custom")
    setRunning(true)
    try {
      const result = await runAgencyReport(orgId, filters)
      if (result?.rows) {
        if (result.mode === "policy") {
          setPolicyRows(result.rows)
          setCustomRows([])
          setCustomReportMode("policy")
        } else {
          setCustomRows(result.rows)
          setPolicyRows([])
          setCustomReportMode("client")
        }
        setGenericRows([])
        setGenericTotals(null)
        setHasRun(true)
        setFiltersChangedSinceRun(false)
      } else if (result?.error) {
        console.error(result.error)
      }
    } finally {
      setRunning(false)
    }
  }, [orgId, filters])

  const handleSelectPreset = useCallback(
    async (presetFilters: ReportFilter[]) => {
      setFilters(presetFilters)
      if (presetFilters.length === 0) {
        setCustomRows([])
        setPolicyRows([])
        setGenericRows([])
        setGenericTotals(null)
        setHasRun(false)
        setReportType("custom")
        setCustomReportMode("client")
        return
      }
      setReportType("custom")
      setRunning(true)
      try {
        const result = await runAgencyReport(orgId, presetFilters)
        if (result?.rows) {
          if (result.mode === "policy") {
            setPolicyRows(result.rows)
            setCustomRows([])
            setCustomReportMode("policy")
          } else {
            setCustomRows(result.rows)
            setPolicyRows([])
            setCustomReportMode("client")
          }
          setGenericRows([])
          setGenericTotals(null)
          setHasRun(true)
          setFiltersChangedSinceRun(false)
        }
      } finally {
        setRunning(false)
      }
    },
    [orgId]
  )

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      if (reportType === "custom") {
        if (customReportMode === "policy") {
          if (policyRows.length === 0) return
          const csv = genericRowsToCsv(AGENCY_SALES_COLUMNS, policyRows)
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `agency-sales-${new Date().toISOString().slice(0, 10)}.csv`
          a.click()
          URL.revokeObjectURL(url)
        } else {
          const rowsToExport =
            selectedIds.size > 0 ? customRows.filter((r) => selectedIds.has(r.id)) : customRows
          if (rowsToExport.length === 0) return
          const idsToExport = selectedIds.size > 0 ? [...selectedIds] : rowsToExport.map((r) => r.id)
          const res = await fetch("/api/reports/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientIds: idsToExport }),
          })
          if (!res.ok) throw new Error("Export log failed")
          const csv = reportRowsToCsv(rowsToExport)
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `agency-report-${new Date().toISOString().slice(0, 10)}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }
      } else {
        const cols =
          reportType === "production"
            ? PRODUCTION_COLUMNS
            : reportType === "roster"
              ? ROSTER_COLUMNS
              : CLIENTS_COLUMNS
        if (genericRows.length === 0) return
        const csv = genericRowsToCsv(cols, genericRows)
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `agency-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error("Export failed", e)
    } finally {
      setExporting(false)
    }
  }

  const displayRows =
    reportType === "custom"
      ? customReportMode === "policy"
        ? policyRows.length
        : customRows.length
      : genericRows.length
  const showExport =
    reportType === "custom"
      ? customReportMode === "policy"
        ? policyRows.length > 0
        : customRows.length > 0
      : genericRows.length > 0

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">
      <div className="flex flex-col gap-6 border-b pb-4 min-[1090px]:flex-row">
        <Card className="min-w-0 flex-1">
          <CardContent className="p-4">
            <ReportBuilder
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onRunReport={runReport}
              onReportSaved={fetchSavedReports}
              runReportDisabled={filters.length === 0 || !filtersChangedSinceRun || running}
              filterDefinitions={AGENCY_FILTER_FIELD_DEFINITIONS}
              organizationId={orgId}
              sourceOptions={sourceOptions}
              carrierOptions={carrierOptions}
              planNameOptions={planNameOptions}
              agencyOptions={agencyOptions}
            />
          </CardContent>
        </Card>
        <Card className="w-full shrink-0 min-[1090px]:w-64">
          <CardContent className="p-4">
            <QuickReportsSidebar
              savedReports={savedReports}
              onSelectPreset={handleSelectPreset}
              onSavedReportDeleted={fetchSavedReports}
              reportLinks={reportLinks}
              filterDefinitions={AGENCY_FILTER_FIELD_DEFINITIONS}
            />
          </CardContent>
        </Card>
      </div>

      <main className="min-h-0 min-w-0 flex-1 overflow-auto">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {!mounted
              ? "Add filters and run a report, or select a Quick Report"
              : !hasRun
                ? "Add filters and run a report, or select a Quick Report"
                : `${displayRows} result${displayRows === 1 ? "" : "s"}`}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={!mounted || !showExport || exporting}
          >
            <Share05 className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
        {reportType === "custom" ? (
          customReportMode === "policy" ? (
            <AgencyReportTable
              columns={AGENCY_SALES_COLUMNS}
              rows={mounted ? policyRows : []}
              rowKey="id"
              emptyMessage={running ? "Loading…" : "No results. Run a report or adjust filters."}
            />
          ) : (
            <ReportResultsTable
              rows={mounted ? customRows : []}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          )
        ) : reportType === "production" ? (
          <ProductionReportTable
            rows={genericRows as { agentId: string; agentName: string; jan?: number; feb?: number; mar?: number; apr?: number; may?: number; jun?: number; jul?: number; aug?: number; sep?: number; oct?: number; nov?: number; dec?: number; yearTotal?: number }[]}
            year={productionYear}
            onYearChange={(year) => {
              setProductionYear(year)
              runQuickReport("production", year)
            }}
            emptyMessage={running ? "Loading…" : "Select a Quick Report or run a custom report."}
          />
        ) : (
          <AgencyReportTable
            columns={
            reportType === "roster"
                  ? ROSTER_COLUMNS
                  : CLIENTS_COLUMNS
            }
            rows={genericRows}
            rowKey={reportType === "clients" ? "agentId" : "userId"}
            totalsRow={genericTotals}
            emptyMessage={
              running ? "Loading…" : "Select a Quick Report or run a custom report."
            }
          />
        )}
      </main>
    </div>
  )
}
