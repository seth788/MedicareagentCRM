"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProductionReportTable } from "./production-report-table"
import { AgentsSubOrgFilter } from "./agents-sub-org-filter"
import { fetchProductionReport } from "@/app/actions/agency-reports"
import { PRODUCTION_COLUMNS, genericRowsToCsv } from "@/lib/agency-report-columns"
import { Share05 } from "@/components/icons"

interface ReportRow {
  agentId: string
  agentName: string
  jan?: number
  feb?: number
  mar?: number
  apr?: number
  may?: number
  jun?: number
  jul?: number
  aug?: number
  sep?: number
  oct?: number
  nov?: number
  dec?: number
  yearTotal?: number
}

export function ProductionReportClient({
  organizationId,
  subOrgs,
  defaultYear,
  defaultSubOrg,
}: {
  organizationId: string
  subOrgs: { id: string; name: string }[]
  defaultYear: number
  defaultSubOrg: string | null
}) {
  const router = useRouter()
  const orgParam = `org=${organizationId}`
  const [rows, setRows] = useState<ReportRow[]>([])
  const [year, setYear] = useState(defaultYear)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setYear(defaultYear)
  }, [defaultYear])

  const loadReport = useCallback(async (y: number) => {
    setLoading(true)
    const result = await fetchProductionReport(organizationId, {
      year: y,
      subOrg: defaultSubOrg,
    })
    if (result?.rows) setRows(result.rows as ReportRow[])
    setLoading(false)
  }, [organizationId, defaultSubOrg])

  useEffect(() => {
    loadReport(year)
  }, [year, loadReport])

  function handleYearChange(newYear: number) {
    setYear(newYear)
    const url = new URL(window.location.href)
    url.searchParams.set("year", String(newYear))
    router.push(url.toString())
  }

  function handleExport() {
    const csv = genericRowsToCsv(PRODUCTION_COLUMNS, rows)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `production-report-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <AgentsSubOrgFilter
          subOrgs={subOrgs}
          baseUrl={`/agency/reports/production?${orgParam}&year=${year}`}
          currentSubOrg={defaultSubOrg}
        />
        <Button size="sm" variant="outline" onClick={handleExport} disabled={rows.length === 0}>
          <Share05 className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Report</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductionReportTable
            rows={rows}
            year={year}
            onYearChange={handleYearChange}
            emptyMessage={loading ? "Loading…" : "No results."}
          />
        </CardContent>
      </Card>
    </div>
  )
}
