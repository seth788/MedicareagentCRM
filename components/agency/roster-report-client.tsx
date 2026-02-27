"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AgentsSubOrgFilter } from "./agents-sub-org-filter"

interface RosterRow {
  userId: string
  displayName: string
  email: string
  phone?: string
  role: string
  organizationName: string
  clientCount: number
  policyCount: number
  acceptedAt: string | null
  status: string
  npn?: string
}

export function RosterReportClient({
  organizationId,
  rows,
  subOrgs,
  currentSubOrg,
  currentStatus,
}: {
  organizationId: string
  rows: RosterRow[]
  subOrgs: { id: string; name: string }[]
  currentSubOrg: string | null
  currentStatus: string | null
}) {
  const router = useRouter()
  const baseUrl = `/agency/reports/roster?org=${organizationId}`

  function handleExport() {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Role",
      "Agency",
      "NPN",
      "Joined",
      "Status",
      "Clients",
      "Policies",
    ]
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.displayName}"`,
          `"${r.email}"`,
          `"${r.phone}"`,
          r.role.replace(/_/g, " "),
          `"${r.organizationName}"`,
          `"${r.npn}"`,
          r.acceptedAt ? new Date(r.acceptedAt).toLocaleDateString() : "",
          r.status,
          r.clientCount,
          r.policyCount,
        ].join(",")
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "agent-roster.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <AgentsSubOrgFilter
          subOrgs={subOrgs}
          baseUrl={baseUrl}
          currentSubOrg={currentSubOrg}
        />
        <div>
          <label className="mb-2 block text-sm font-medium">Status</label>
          <select
            className="rounded border bg-background px-3 py-2 text-sm"
            value={currentStatus ?? ""}
            onChange={(e) => {
              const v = e.target.value
              const url = new URL(window.location.href)
              if (v) url.searchParams.set("status", v)
              else url.searchParams.delete("status")
              router.push(url.toString())
            }}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <Button onClick={handleExport}>Export CSV</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left font-medium">Name</th>
                  <th className="px-2 py-2 text-left font-medium">Email</th>
                  <th className="px-2 py-2 text-left font-medium">Phone</th>
                  <th className="px-2 py-2 text-left font-medium">Role</th>
                  <th className="px-2 py-2 text-left font-medium">Agency</th>
                  <th className="px-2 py-2 text-left font-medium">NPN</th>
                  <th className="px-2 py-2 text-left font-medium">Joined</th>
                  <th className="px-2 py-2 text-left font-medium">Status</th>
                  <th className="px-2 py-2 text-right font-medium">Clients</th>
                  <th className="px-2 py-2 text-right font-medium">Policies</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.userId} className="border-b last:border-0">
                    <td className="px-2 py-2">{r.displayName}</td>
                    <td className="px-2 py-2">{r.email}</td>
                    <td className="px-2 py-2">{r.phone ?? "—"}</td>
                    <td className="px-2 py-2">{r.role.replace(/_/g, " ")}</td>
                    <td className="px-2 py-2">{r.organizationName}</td>
                    <td className="px-2 py-2">{r.npn ?? "—"}</td>
                    <td className="px-2 py-2">
                      {r.acceptedAt ? new Date(r.acceptedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-2 py-2">{r.status}</td>
                    <td className="px-2 py-2 text-right">{r.clientCount}</td>
                    <td className="px-2 py-2 text-right">{r.policyCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
