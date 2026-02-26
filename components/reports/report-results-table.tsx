"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import type { ReportRow } from "@/lib/db/reports"
import { formatPhoneNumber } from "@/lib/utils"

interface ReportResultsTableProps {
  rows: ReportRow[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

export function ReportResultsTable({ rows, selectedIds, onSelectionChange }: ReportResultsTableProps) {
  const showAddressCol = rows.some((r) => r.address != null || r.addressSingle != null)
  const showEmailCol = rows.some((r) => r.email != null || r.emailSingle != null)
  const showPhoneCol = rows.some((r) => r.phone != null || r.phoneSingle != null)
  const showCoverageCol = rows.some((r) => (r.planTypes?.length ?? 0) > 0)

  const toggleAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(rows.map((r) => r.id)))
    } else {
      onSelectionChange(new Set())
    }
  }

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    onSelectionChange(next)
  }

  const allSelected = rows.length > 0 && selectedIds.size === rows.length
  const someSelected = selectedIds.size > 0

  return (
    <div className="min-w-0 rounded-lg border bg-card overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected || (someSelected && "indeterminate")}
                onCheckedChange={(c) => toggleAll(c === true)}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last</TableHead>
            <TableHead>First</TableHead>
            <TableHead className="hidden lg:table-cell">Middle</TableHead>
            <TableHead className="hidden md:table-cell">Suffix</TableHead>
            <TableHead className="hidden xl:table-cell">Nickname</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Source</TableHead>
            {showAddressCol && <TableHead>Address</TableHead>}
            {showEmailCol && <TableHead>Email</TableHead>}
            {showPhoneCol && <TableHead>Phone</TableHead>}
            {showCoverageCol && <TableHead className="hidden xl:table-cell">Coverage</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={14} className="h-24 text-center text-muted-foreground">
                No results. Run a report or adjust filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const addr = row.address ?? row.addressSingle ?? ""
              const email = row.email ?? row.emailSingle ?? ""
              const phone = row.phone ?? row.phoneSingle ?? ""
              const showPreferredAddr = row.address != null
              const showPreferredEmail = row.email != null
              const showPreferredPhone = row.phone != null

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onCheckedChange={(c) => toggleOne(row.id, c === true)}
                      aria-label={`Select ${row.lastName}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}…</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${row.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${row.id}`}
                      className="text-foreground hover:underline"
                    >
                      {row.firstName}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{row.middleName || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{row.suffix || "—"}</TableCell>
                  <TableCell className="hidden xl:table-cell">{row.nickname || "—"}</TableCell>
                  <TableCell>{row.gender || "—"}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{row.source || "—"}</TableCell>
                  {showAddressCol && (
                    <TableCell className="max-w-[180px] truncate" title={addr}>
                      {addr || "—"}
                      {showPreferredAddr && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(Preferred)</span>
                      )}
                    </TableCell>
                  )}
                  {showEmailCol && (
                    <TableCell className="max-w-[180px] truncate" title={email}>
                      {email || "—"}
                      {showPreferredEmail && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(Preferred)</span>
                      )}
                    </TableCell>
                  )}
                  {showPhoneCol && (
                    <TableCell>
                      {phone ? formatPhoneNumber(phone) : "—"}
                      {showPreferredPhone && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(Preferred)</span>
                      )}
                    </TableCell>
                  )}
                  {showCoverageCol && (
                    <TableCell className="hidden xl:table-cell">
                      {row.planTypes?.join(", ") ?? "—"}
                    </TableCell>
                  )}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
