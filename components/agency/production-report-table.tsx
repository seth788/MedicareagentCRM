"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
type ProductionRow = Record<string, unknown> & {
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

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const

function monthHeaders(year: number) {
  const yy = String(year).slice(-2)
  return MONTH_KEYS.map((_, i) => `${i + 1}/${yy}`)
}

type SortKey = "agentName" | (typeof MONTH_KEYS)[number] | "yearTotal"
type SortDir = "asc" | "desc"

interface ProductionReportTableProps {
  rows: ProductionRow[]
  year: number
  onYearChange: (year: number) => void
  emptyMessage?: string
}

export function ProductionReportTable({
  rows,
  year,
  onYearChange,
  emptyMessage = "No results.",
}: ProductionReportTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("yearTotal")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      const isNumeric = key !== "agentName"
      setSortKey(key)
      setSortDir(isNumeric ? "desc" : "asc")
    }
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      const isNumeric = typeof aVal === "number" || typeof bVal === "number"
      let cmp = 0
      if (isNumeric) {
        cmp = (Number(aVal) ?? 0) - (Number(bVal) ?? 0)
      } else {
        cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""))
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  const totalsRow = useMemo(() => {
    if (rows.length === 0) return null
    const t: Record<string, unknown> = {
      agentName: "Total",
      jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
      jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
      yearTotal: 0,
    }
    for (const r of rows) {
      for (const k of MONTH_KEYS) {
        t[k] = (Number(t[k]) ?? 0) + (Number(r[k]) ?? 0)
      }
      t.yearTotal = (Number(t.yearTotal) ?? 0) + (Number(r.yearTotal) ?? 0)
    }
    return t
  }, [rows])

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i)
  const monthHdrs = monthHeaders(year)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Year:</span>
        <Select value={String(year)} onValueChange={(v) => onYearChange(parseInt(v, 10))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 rounded-lg border border-border/60 overflow-auto bg-white text-[14px] leading-snug dark:bg-white dark:text-gray-900">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border/60">
              <th
                role="button"
                tabIndex={0}
                className="text-left font-medium text-foreground py-1 px-1.5 whitespace-nowrap cursor-pointer hover:underline"
                onClick={() => handleSort("agentName")}
                onKeyDown={(e) => e.key === "Enter" && handleSort("agentName")}
              >
                Agent
              </th>
              {MONTH_KEYS.map((k, i) => (
                <th
                  key={k}
                  role="button"
                  tabIndex={0}
                  className="text-right font-medium text-foreground py-1 px-1.5 whitespace-nowrap cursor-pointer hover:underline"
                  onClick={() => handleSort(k)}
                  onKeyDown={(e) => e.key === "Enter" && handleSort(k)}
                >
                  {monthHdrs[i]}
                </th>
              ))}
              <th
                role="button"
                tabIndex={0}
                className="text-right font-medium text-foreground py-1 px-1.5 whitespace-nowrap cursor-pointer hover:underline"
                onClick={() => handleSort("yearTotal")}
                onKeyDown={(e) => e.key === "Enter" && handleSort("yearTotal")}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={14} className="h-16 text-center text-muted-foreground py-2">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => (
                <tr key={`${row.agentId}-${index}`} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="whitespace-nowrap py-0.5 px-1.5">{row.agentName ?? "—"}</td>
                  {MONTH_KEYS.map((k) => {
                    const val = row[k] != null ? Number(row[k]) : 0
                    return (
                      <td key={k} className={`text-right py-0.5 px-1.5 ${val !== 0 ? "font-semibold" : "text-muted-foreground"}`}>
                        {val}
                      </td>
                    )
                  })}
                  <td className="text-right py-0.5 px-1.5 font-semibold text-green-600 dark:text-green-500">
                    {row.yearTotal ?? 0}
                  </td>
                </tr>
              ))
            )}
            {sortedRows.length > 0 && totalsRow && (
              <tr className="border-t border-border font-semibold bg-muted/40">
                <td className="whitespace-nowrap py-0.5 px-1.5">{String(totalsRow.agentName ?? "")}</td>
                {MONTH_KEYS.map((k) => (
                  <td key={k} className="text-right py-0.5 px-1.5">
                    {String(totalsRow[k] ?? 0)}
                  </td>
                ))}
                <td className="text-right py-0.5 px-1.5 text-green-600 dark:text-green-500">
                  {String(totalsRow.yearTotal ?? 0)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
