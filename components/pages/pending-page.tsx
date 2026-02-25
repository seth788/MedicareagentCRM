"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import { Search, Clock, CheckCircle2 } from "@/components/icons"
import { AppHeader } from "@/components/app-header"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// -- Commission payment status options --
type CommissionStatus = "paid_full" | "partial" | "trued_up" | "not_paid" | "chargeback"

const COMMISSION_STATUS_OPTIONS: {
  value: CommissionStatus
  label: string
  color: string
  bgColor: string
  borderColor: string
}[] = [
  {
    value: "paid_full",
    label: "Paid Full",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500",
    borderColor: "border-emerald-200 bg-emerald-50",
  },
  {
    value: "partial",
    label: "Partial (needs tru-up)",
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    borderColor: "border-blue-200 bg-blue-50",
  },
  {
    value: "trued_up",
    label: "Trued-up",
    color: "text-blue-700",
    bgColor: "bg-blue-700",
    borderColor: "border-blue-200 bg-blue-50",
  },
  {
    value: "not_paid",
    label: "Not paid",
    color: "text-red-600",
    bgColor: "bg-red-500",
    borderColor: "border-red-200 bg-red-50",
  },
  {
    value: "chargeback",
    label: "Chargeback",
    color: "text-amber-600",
    bgColor: "bg-amber-500",
    borderColor: "border-amber-200 bg-amber-50",
  },
]

function CommissionStatusIcon({ status }: { status: CommissionStatus | null }) {
  if (!status) {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30">
        <span className="sr-only">No status</span>
      </span>
    )
  }
  const option = COMMISSION_STATUS_OPTIONS.find((o) => o.value === status)
  if (!option) return null

  return (
    <span className={`relative flex h-5 w-5 items-center justify-center rounded-full ${option.bgColor}`}>
      {status === "paid_full" && (
        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {status === "partial" && (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="10" className="fill-blue-500" />
          <path d="M10 0 A10 10 0 0 1 10 20 Z" className="fill-white" />
        </svg>
      )}
      {status === "trued_up" && (
        <span className="h-2 w-2 rounded-full bg-white" />
      )}
      {status === "not_paid" && (
        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M6 12h12" />
        </svg>
      )}
      {status === "chargeback" && (
        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      )}
    </span>
  )
}

function CommissionStatusPicker({
  value,
  onChange,
}: {
  value: CommissionStatus | null
  onChange: (v: CommissionStatus) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-[40px] items-center justify-center rounded-md p-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Set commission status"
        >
          <CommissionStatusIcon status={value} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="center" side="bottom">
        <div className="flex flex-col">
          {COMMISSION_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onChange(option.value)}
            >
              <CommissionStatusIcon status={option.value} />
              <span className="text-foreground">{option.label}</span>
              {value === option.value && (
                <svg className="ml-auto h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// -- Mock data for demonstration --
interface PendingApplication {
  id: string
  clientName: string
  planType: string
  company: string
  policy: string
  effectiveDate: string
  writtenAs: string
  issued: boolean
  commissionStatus: CommissionStatus | null
  status: "Pending/Submitted" | "Pending (not agent of record)"
}

const MOCK_PENDING: PendingApplication[] = [
  {
    id: "1",
    clientName: "Johnson, Mary",
    planType: "MAPD",
    company: "Anthem",
    policy: "Anthem Medicare Advantage 4 (PPO)",
    effectiveDate: "2026-05-01",
    writtenAs: "Like Plan Change",
    issued: false,
    commissionStatus: "not_paid",
    status: "Pending/Submitted",
  },
  {
    id: "2",
    clientName: "Williams, Robert",
    planType: "PDP",
    company: "Humana",
    policy: "Humana Walmart Value Rx Plan",
    effectiveDate: "2026-04-01",
    writtenAs: "New to Medicare",
    issued: false,
    commissionStatus: null,
    status: "Pending/Submitted",
  },
  {
    id: "3",
    clientName: "Davis, Patricia",
    planType: "MAPD",
    company: "UnitedHealthcare",
    policy: "AARP Medicare Advantage (HMO-POS)",
    effectiveDate: "2026-03-01",
    writtenAs: "Unlike Plan Change",
    issued: false,
    commissionStatus: "partial",
    status: "Pending (not agent of record)",
  },
  {
    id: "4",
    clientName: "Garcia, James",
    planType: "MAPD",
    company: "Aetna",
    policy: "Aetna Medicare Eagle (PPO)",
    effectiveDate: "2026-06-01",
    writtenAs: "AOR Change",
    issued: false,
    commissionStatus: "paid_full",
    status: "Pending/Submitted",
  },
  {
    id: "5",
    clientName: "Brown, Linda",
    planType: "PDP",
    company: "SilverScript",
    policy: "SilverScript Choice (PDP)",
    effectiveDate: "2026-04-15",
    writtenAs: "Like Plan Change (same company)",
    issued: false,
    commissionStatus: null,
    status: "Pending (not agent of record)",
  },
]

type StatusFilter = "all" | "pending_submitted" | "pending_not_aor"

export default function PendingPageInner() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [applications, setApplications] = useState<PendingApplication[]>(MOCK_PENDING)

  const filtered = useMemo(() => {
    let result = [...applications]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) =>
          a.clientName.toLowerCase().includes(q) ||
          a.company.toLowerCase().includes(q) ||
          a.policy.toLowerCase().includes(q) ||
          a.planType.toLowerCase().includes(q)
      )
    }
    if (statusFilter === "pending_submitted") {
      result = result.filter((a) => a.status === "Pending/Submitted")
    } else if (statusFilter === "pending_not_aor") {
      result = result.filter((a) => a.status === "Pending (not agent of record)")
    }
    return result
  }, [applications, search, statusFilter])

  const handleToggleIssued = (id: string) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, issued: !a.issued } : a))
    )
  }

  const handleCommissionChange = (id: string, status: CommissionStatus) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, commissionStatus: status } : a))
    )
  }

  const openCmd = () => {
    const fn = (window as unknown as Record<string, unknown>).__openCommandPalette
    if (typeof fn === "function") (fn as () => void)()
  }

  return (
    <>
      <AppHeader title="Pending Applications" onOpenCommandPalette={openCmd} />

      <div className="flex-1 overflow-auto overflow-x-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-6">
          <div className="relative min-w-0 flex-1 md:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search pending applications..."
              className="h-8 pl-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(
              [
                { label: "All", value: "all" },
                { label: "Pending/Submitted", value: "pending_submitted" },
                { label: "Not AOR", value: "pending_not_aor" },
              ] as const
            ).map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={statusFilter === f.value ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Badge variant="outline" className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700">
            <Clock className="h-3 w-3" />
            {applications.filter((a) => a.status === "Pending/Submitted").length} Pending/Submitted
          </Badge>
          <Badge variant="outline" className="gap-1.5 border-muted bg-muted text-muted-foreground">
            <Clock className="h-3 w-3" />
            {applications.filter((a) => a.status === "Pending (not agent of record)").length} Not AOR
          </Badge>
          <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            {applications.filter((a) => a.issued).length} Issued
          </Badge>
        </div>

        {/* Table */}
        <div className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="min-w-0 rounded-lg border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[140px]">Name</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Company</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[200px]">Policy</TableHead>
                    <TableHead className="hidden lg:table-cell">Effective</TableHead>
                    <TableHead className="hidden xl:table-cell">Written As</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-center">Paid</TableHead>
                    <TableHead className="text-center">Issued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            No pending applications found
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((app) => (
                      <TableRow key={app.id}>
                        {/* Name - always visible, stacked on mobile */}
                        <TableCell className="py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">
                              {app.clientName}
                            </span>
                            {/* Mobile-only stacked info */}
                            <div className="flex flex-wrap items-center gap-1.5 md:hidden">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {app.planType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{app.company}</span>
                            </div>
                            <span className="text-xs text-muted-foreground md:hidden">
                              {format(parseLocalDate(app.effectiveDate), "MMM d, yyyy")}
                            </span>
                          </div>
                        </TableCell>
                        {/* Type */}
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className="text-xs font-medium">
                            {app.planType}
                          </Badge>
                        </TableCell>
                        {/* Company */}
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {app.company}
                        </TableCell>
                        {/* Policy */}
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {app.policy}
                        </TableCell>
                        {/* Effective Date */}
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-foreground">
                            {format(parseLocalDate(app.effectiveDate), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        {/* Written As */}
                        <TableCell className="hidden xl:table-cell">
                          <span className="text-xs text-muted-foreground">{app.writtenAs}</span>
                        </TableCell>
                        {/* Status */}
                        <TableCell className="hidden md:table-cell">
                          <Badge
                            variant="outline"
                            className={
                              app.status === "Pending/Submitted"
                                ? "border-amber-200 bg-amber-50 text-amber-700 text-[11px]"
                                : "border-muted text-muted-foreground text-[11px]"
                            }
                          >
                            {app.status === "Pending/Submitted" ? "Pending" : "Not AOR"}
                          </Badge>
                        </TableCell>
                        {/* Commission Paid */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <CommissionStatusPicker
                              value={app.commissionStatus}
                              onChange={(v) => handleCommissionChange(app.id, v)}
                            />
                          </div>
                        </TableCell>
                        {/* Issued checkbox */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={app.issued}
                              onCheckedChange={() => handleToggleIssued(app.id)}
                              aria-label={`Mark ${app.clientName} as issued`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Count */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {applications.length} pending applications
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
