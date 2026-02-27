"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AgentsSubOrgFilter } from "./agents-sub-org-filter"

interface RenewalRow {
  clientName: string
  agentId: string
  agentName: string
  agencyName: string
  planName: string
  carrier: string
  planType: string
  effectiveDate: string
  renewalDate: string
}

export function RenewalsReportClient({
  organizationId,
  rows,
  subOrgs,
  defaultStart,
  defaultEnd,
  defaultSubOrg,
  defaultPlanType,
}: {
  organizationId: string
  rows: RenewalRow[]
  subOrgs: { id: string; name: string }[]
  defaultStart: string
  defaultEnd: string
  defaultSubOrg: string | null
  defaultPlanType: string
}) {
  const router = useRouter()
  const orgParam = `org=${organizationId}`
  const baseUrl = `/agency/reports/renewals?${orgParam}&start=${defaultStart}&end=${defaultEnd}`

  function handleExport() {
    const headers = [
      "Client",
      "Agent",
      "Agency",
      "Plan",
      "Carrier",
      "Plan Type",
      "Effective Date",
      "Renewal Date",
    ]
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.clientName}"`,
          `"${r.agentName}"`,
          `"${r.agencyName}"`,
          `"${r.planName}"`,
          `"${r.carrier}"`,
          r.planType,
          r.effectiveDate,
          r.renewalDate,
        ].join(",")
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `renewals-${defaultStart}-${defaultEnd}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
          baseUrl={baseUrl}
          currentSubOrg={defaultSubOrg}
        />
        <div>
          <Label>Plan type</Label>
          <select
            className="rounded border bg-background px-3 py-2 text-sm"
            value={defaultPlanType}
            onChange={(e) => {
              const url = new URL(window.location.href)
              const v = e.target.value
              if (v === "all") url.searchParams.delete("plan_type")
              else url.searchParams.set("plan_type", v)
              router.push(url.toString())
            }}
          >
            <option value="all">All</option>
            <option value="MAPD">MAPD</option>
            <option value="PDP">PDP</option>
            <option value="Med Supp">Med Supp</option>
          </select>
        </div>
        <Button onClick={handleExport}>Export CSV</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Renewal Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left font-medium">Client</th>
                  <th className="px-2 py-2 text-left font-medium">Agent</th>
                  <th className="px-2 py-2 text-left font-medium">Agency</th>
                  <th className="px-2 py-2 text-left font-medium">Plan</th>
                  <th className="px-2 py-2 text-left font-medium">Carrier</th>
                  <th className="px-2 py-2 text-left font-medium">Plan Type</th>
                  <th className="px-2 py-2 text-left font-medium">Effective</th>
                  <th className="px-2 py-2 text-left font-medium">Renewal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-2 py-2">{r.clientName}</td>
                    <td className="px-2 py-2">{r.agentName}</td>
                    <td className="px-2 py-2">{r.agencyName}</td>
                    <td className="px-2 py-2">{r.planName}</td>
                    <td className="px-2 py-2">{r.carrier}</td>
                    <td className="px-2 py-2">{r.planType}</td>
                    <td className="px-2 py-2">
                      {r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-2 py-2">
                      {r.renewalDate ? new Date(r.renewalDate).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No renewals in date range</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
