"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AgentsSubOrgFilter } from "./agents-sub-org-filter"

interface ReportRow {
  agentId: string
  agentName: string
  agencyName: string
  mapd: number
  pdp: number
  medSupp: number
  dsnp: number
  other: number
  total: number
}

export function ProductionReportClient({
  organizationId,
  rows,
  subOrgs,
  defaultStart,
  defaultEnd,
  defaultSubOrg,
}: {
  organizationId: string
  rows: ReportRow[]
  subOrgs: { id: string; name: string }[]
  defaultStart: string
  defaultEnd: string
  defaultSubOrg: string | null
}) {
  const router = useRouter()
  const orgParam = `org=${organizationId}`

  function handleExport() {
    const headers = [
      "Agent Name",
      "Agency",
      "MAPD",
      "PDP",
      "Med Supp",
      "DSNP",
      "Other",
      "Total",
    ]
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.agentName}"`,
          `"${r.agencyName}"`,
          r.mapd,
          r.pdp,
          r.medSupp,
          r.dsnp,
          r.other,
          r.total,
        ].join(",")
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `production-report-${defaultStart}-${defaultEnd}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totals = rows.reduce(
    (acc, r) => ({
      mapd: acc.mapd + r.mapd,
      pdp: acc.pdp + r.pdp,
      medSupp: acc.medSupp + r.medSupp,
      dsnp: acc.dsnp + r.dsnp,
      other: acc.other + r.other,
      total: acc.total + r.total,
    }),
    { mapd: 0, pdp: 0, medSupp: 0, dsnp: 0, other: 0, total: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label>Start date</Label>
          <Input
            type="date"
            defaultValue={defaultStart}
            onChange={(e) => {
              const url = new URL(window.location.href)
              url.searchParams.set("start", e.target.value)
              router.push(url.toString())
            }}
            className="w-40"
          />
        </div>
        <div>
          <Label>End date</Label>
          <Input
            type="date"
            defaultValue={defaultEnd}
            onChange={(e) => {
              const url = new URL(window.location.href)
              url.searchParams.set("end", e.target.value)
              router.push(url.toString())
            }}
            className="w-40"
          />
        </div>
        <AgentsSubOrgFilter
          subOrgs={subOrgs}
          baseUrl={`/agency/reports/production?${orgParam}&start=${defaultStart}&end=${defaultEnd}`}
          currentSubOrg={defaultSubOrg}
        />
        <Button onClick={handleExport}>Export CSV</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left font-medium">Agent</th>
                  <th className="px-2 py-2 text-left font-medium">Agency</th>
                  <th className="px-2 py-2 text-right font-medium">MAPD</th>
                  <th className="px-2 py-2 text-right font-medium">PDP</th>
                  <th className="px-2 py-2 text-right font-medium">Med Supp</th>
                  <th className="px-2 py-2 text-right font-medium">DSNP</th>
                  <th className="px-2 py-2 text-right font-medium">Other</th>
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.agentId} className="border-b last:border-0">
                    <td className="px-2 py-2">{r.agentName}</td>
                    <td className="px-2 py-2">{r.agencyName}</td>
                    <td className="px-2 py-2 text-right">{r.mapd}</td>
                    <td className="px-2 py-2 text-right">{r.pdp}</td>
                    <td className="px-2 py-2 text-right">{r.medSupp}</td>
                    <td className="px-2 py-2 text-right">{r.dsnp}</td>
                    <td className="px-2 py-2 text-right">{r.other}</td>
                    <td className="px-2 py-2 text-right font-medium">{r.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="px-2 py-2" colSpan={2}>
                    Total
                  </td>
                  <td className="px-2 py-2 text-right">{totals.mapd}</td>
                  <td className="px-2 py-2 text-right">{totals.pdp}</td>
                  <td className="px-2 py-2 text-right">{totals.medSupp}</td>
                  <td className="px-2 py-2 text-right">{totals.dsnp}</td>
                  <td className="px-2 py-2 text-right">{totals.other}</td>
                  <td className="px-2 py-2 text-right">{totals.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
