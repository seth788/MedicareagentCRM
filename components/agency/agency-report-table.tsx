"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface AgencyReportColumn<T = Record<string, unknown>> {
  key: string
  header: string
  align?: "left" | "right" | "center"
  className?: string
  render?: (row: T) => React.ReactNode
}

interface AgencyReportTableProps<T extends Record<string, unknown>> {
  columns: AgencyReportColumn<T>[]
  rows: T[]
  rowKey: string
  totalsRow?: Partial<T> | null
  emptyMessage?: string
}

export function AgencyReportTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  totalsRow,
  emptyMessage = "No results.",
}: AgencyReportTableProps<T>) {
  const getCellValue = (row: T, col: AgencyReportColumn<T>) => {
    if (col.render) return col.render(row)
    const val = row[col.key]
    if (val == null || val === "") return "—"
    return String(val)
  }

  const alignClass = (align?: "left" | "right" | "center") => {
    if (align === "right") return "text-right"
    if (align === "center") return "text-center"
    return "text-left"
  }

  return (
    <div className="min-w-0 rounded-lg border bg-card overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={`${alignClass(col.align)} ${col.className ?? ""}`}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={`${String(row[rowKey] ?? "")}-${index}`}>
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={`${alignClass(col.align)} ${col.className ?? ""}`}
                  >
                    {getCellValue(row, col)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
          {rows.length > 0 && totalsRow && (
            <TableRow className="border-t font-medium bg-muted/50">
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={`${alignClass(col.align)} ${col.className ?? ""}`}
                >
                  {getCellValue(totalsRow as T, col)}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
