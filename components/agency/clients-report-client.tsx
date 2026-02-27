"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AgentsSubOrgFilter } from "./agents-sub-org-filter"

interface ClientRow {
  agentId: string
  agentName: string
  agencyName: string
  total: number
  new: number
  active: number
  lead: number
  inactive: number
}

export function ClientsReportClient({
  organizationId,
  rows,
  subOrgs,
  defaultStart,
  defaultEnd,
  defaultSubOrg,
}: {
  organizationId: string
  rows: ClientRow[]
  subOrgs: { id: string; name: string }[]
  defaultStart: string
  defaultEnd: string
  defaultSubOrg: string | null
}) {
  const router = useRouter()
  const orgParam = `org=${organizationId}`

  function handleExport() {
    const headers = ["Agent", "Agency", "Total", "New", "Active", "Lead", "Inactive"]
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.agentName}"`,
          `"${r.agencyName}"`,
          r.total,
          r.new,
          r.active,
          r.lead,
          r.inactive,
        ].join(",")
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `client-summary-${defaultStart}-${defaultEnd}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      new: acc.new + r.new,
      active: acc.active + r.active,
      lead: acc.lead + r.lead,
      inactive: acc.inactive + r.inactive,
    }),
    { total: 0, new: 0, active: 0, lead: 0, inactive: 0 }
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
          baseUrl={`/agency/reports/clients?${orgParam}&start=${defaultStart}&end=${defaultEnd}`}
          currentSubOrg={defaultSubOrg}
        />
        <Button onClick={handleExport}>Export CSV</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left font-medium">Agent</th>
                  <th className="px-2 py-2 text-left font-medium">Agency</th>
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                  <th className="px-2 py-2 text-right font-medium">New</th>
                  <th className="px-2 py-2 text-right font-medium">Active</th>
                  <th className="px-2 py-2 text-right font-medium">Lead</th>
                  <th className="px-2 py-2 text-right font-medium">Inactive</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.agentId} className="border-b last:border-0">
                    <td className="px-2 py-2">{r.agentName}</td>
                    <td className="px-2 py-2">{r.agencyName}</td>
                    <td className="px-2 py-2 text-right">{r.total}</td>
                    <td className="px-2 py-2 text-right">{r.new}</td>
                    <td className="px-2 py-2 text-right">{r.active}</td>
                    <td className="px-2 py-2 text-right">{r.lead}</td>
                    <td className="px-2 py-2 text-right">{r.inactive}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="px-2 py-2" colSpan={2}>
                    Total
                  </td>
                  <td className="px-2 py-2 text-right">{totals.total}</td>
                  <td className="px-2 py-2 text-right">{totals.new}</td>
                  <td className="px-2 py-2 text-right">{totals.active}</td>
                  <td className="px-2 py-2 text-right">{totals.lead}</td>
                  <td className="px-2 py-2 text-right">{totals.inactive}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
