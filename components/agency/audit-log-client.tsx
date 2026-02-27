"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AuditRow {
  id: string
  action: string
  performedByName: string
  targetUserName: string | null
  details: Record<string, unknown> | null
  createdAt: string
}

export function AuditLogClient({
  organizationId,
  rows,
  defaultStart,
  defaultEnd,
  page,
  totalPages,
}: {
  organizationId: string
  rows: AuditRow[]
  defaultStart: string
  defaultEnd: string
  page: number
  totalPages: number
}) {
  const router = useRouter()
  const orgParam = `org=${organizationId}`

  function buildUrl(updates: Record<string, string>) {
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(updates)) {
      if (v) url.searchParams.set(k, v)
      else url.searchParams.delete(k)
    }
    return url.toString()
  }

  function formatDetails(details: Record<string, unknown> | null): string {
    if (!details || Object.keys(details).length === 0) return ""
    const parts: string[] = []
    if (details.old_role && details.new_role) {
      parts.push(`Role: ${details.old_role} → ${details.new_role}`)
    }
    if (details.role) parts.push(`Role: ${details.role}`)
    if (details.org_name) parts.push(`Org: ${details.org_name}`)
    if (details.sub_agency_name) parts.push(`Sub-agency: ${details.sub_agency_name}`)
    return parts.join(". ")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label>Start date</Label>
          <Input
            type="date"
            defaultValue={defaultStart}
            onChange={(e) => router.push(buildUrl({ start: e.target.value }))}
            className="w-40"
          />
        </div>
        <div>
          <Label>End date</Label>
          <Input
            type="date"
            defaultValue={defaultEnd}
            onChange={(e) => router.push(buildUrl({ end: e.target.value }))}
            className="w-40"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <span className="font-medium">{r.action}</span>
                  {r.targetUserName && (
                    <span className="text-muted-foreground"> · {r.targetUserName}</span>
                  )}
                  <div className="mt-1 text-muted-foreground">
                    By {r.performedByName} ·{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                  {formatDetails(r.details) && (
                    <div className="mt-1 text-muted-foreground">
                      {formatDetails(r.details)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {rows.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No entries</p>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() =>
                    router.push(
                      buildUrl({
                        start: defaultStart,
                        end: defaultEnd,
                        page: String(page - 1),
                      })
                    )
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    router.push(
                      buildUrl({
                        start: defaultStart,
                        end: defaultEnd,
                        page: String(page + 1),
                      })
                    )
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
