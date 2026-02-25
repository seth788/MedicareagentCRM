"use client"

import { useState, useMemo, useCallback } from "react"
import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  isWithinInterval,
} from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import { Search, Clock, CheckCircle2, ChevronDown, Calendar as CalendarIcon } from "@/components/icons"
import { AppHeader } from "@/components/app-header"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// ────────────────────────────────────────────────────────────
//  Commission status
// ────────────────────────────────────────────────────────────
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
    <span className="relative flex h-5 w-5 items-center justify-center">
      {status === "paid_full" && (
        <svg className="h-5 w-5" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="10" className="fill-emerald-500" />
          <path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {status === "partial" && (
        <svg className="h-5 w-5" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="10" className="fill-blue-100" />
          <path d="M10 0 A10 10 0 0 1 10 20 Z" className="fill-blue-500" />
          <circle cx="10" cy="10" r="9" fill="none" className="stroke-blue-500" strokeWidth="2" />
        </svg>
      )}
      {status === "trued_up" && (
        <svg className="h-5 w-5" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="10" className="fill-blue-500" />
        </svg>
      )}
      {status === "not_paid" && (
        <svg className="h-5 w-5" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="10" className="fill-red-500" />
          <path d="M6 10h8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {status === "chargeback" && (
        <svg className="h-5 w-5" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="10" className="fill-amber-500" />
          <path d="M7 7l6 6M13 7l-6 6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
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

// ────────────────────────────────────────────────────────────
//  Date range presets
// ────────────────────────────────────────────────────────────
type DateRangePreset =
  | "this_month"
  | "this_quarter"
  | "this_year"
  | "last_month"
  | "last_quarter"
  | "last_year"
  | "month_to_date"
  | "quarter_to_date"
  | "year_to_date"
  | "last_7"
  | "last_14"
  | "last_30"
  | "last_60"
  | "last_90"
  | "last_6_months"
  | "last_12_months"
  | "custom"

interface PresetOption {
  value: DateRangePreset
  label: string
  group: string
}

const DATE_PRESET_OPTIONS: PresetOption[] = [
  { value: "this_month", label: "This Month", group: "current" },
  { value: "this_quarter", label: "This Quarter", group: "current" },
  { value: "this_year", label: "This Year", group: "current" },
  { value: "last_month", label: "Last Month", group: "previous" },
  { value: "last_quarter", label: "Last Quarter", group: "previous" },
  { value: "last_year", label: "Last Year", group: "previous" },
  { value: "month_to_date", label: "Month to Date", group: "to_date" },
  { value: "quarter_to_date", label: "Quarter to Date", group: "to_date" },
  { value: "year_to_date", label: "Year to Date", group: "to_date" },
  { value: "last_7", label: "Last 7 Days", group: "days" },
  { value: "last_14", label: "Last 14 Days", group: "days" },
  { value: "last_30", label: "Last 30 Days", group: "days" },
  { value: "last_60", label: "Last 60 Days", group: "days" },
  { value: "last_90", label: "Last 90 Days", group: "days" },
  { value: "last_6_months", label: "Last 6 Months", group: "days" },
  { value: "last_12_months", label: "Last 12 Months", group: "days" },
  { value: "custom", label: "Custom Dates...", group: "custom" },
]

function getDateRange(
  preset: DateRangePreset,
  customFrom?: Date,
  customTo?: Date
): { from: Date; to: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  switch (preset) {
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case "this_quarter":
      return { from: startOfQuarter(now), to: endOfQuarter(now) }
    case "this_year":
      return { from: startOfYear(now), to: endOfYear(now) }
    case "last_month": {
      const prev = subMonths(now, 1)
      return { from: startOfMonth(prev), to: endOfMonth(prev) }
    }
    case "last_quarter": {
      const prev = subMonths(now, 3)
      return { from: startOfQuarter(prev), to: endOfQuarter(prev) }
    }
    case "last_year": {
      const prev = new Date(now.getFullYear() - 1, 0, 1)
      return { from: startOfYear(prev), to: endOfYear(prev) }
    }
    case "month_to_date":
      return { from: startOfMonth(now), to: today }
    case "quarter_to_date":
      return { from: startOfQuarter(now), to: today }
    case "year_to_date":
      return { from: startOfYear(now), to: today }
    case "last_7":
      return { from: subDays(today, 7), to: today }
    case "last_14":
      return { from: subDays(today, 14), to: today }
    case "last_30":
      return { from: subDays(today, 30), to: today }
    case "last_60":
      return { from: subDays(today, 60), to: today }
    case "last_90":
      return { from: subDays(today, 90), to: today }
    case "last_6_months":
      return { from: subMonths(today, 6), to: today }
    case "last_12_months":
      return { from: subMonths(today, 12), to: today }
    case "custom":
      return {
        from: customFrom ?? subDays(today, 60),
        to: customTo ?? today,
      }
    default:
      return { from: subDays(today, 60), to: today }
  }
}

function DateRangePicker({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: {
  preset: DateRangePreset
  onPresetChange: (p: DateRangePreset) => void
  customFrom: Date | undefined
  customTo: Date | undefined
  onCustomFromChange: (d: Date | undefined) => void
  onCustomToChange: (d: Date | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(preset === "custom")

  const activeLabel =
    DATE_PRESET_OPTIONS.find((o) => o.value === preset)?.label ?? "Last 60 Days"

  const range = getDateRange(preset, customFrom, customTo)
  const rangeLabel = `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`

  const groups = ["current", "previous", "to_date", "days", "custom"]

  const handleSelect = (value: DateRangePreset) => {
    if (value === "custom") {
      setShowCustom(true)
      onPresetChange(value)
    } else {
      setShowCustom(false)
      onPresetChange(value)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{activeLabel}</span>
          <span className="sm:hidden">Range</span>
          <ChevronDown className="ml-0.5 h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        side="bottom"
      >
        {!showCustom ? (
          <div className="max-h-[400px] overflow-y-auto py-1">
            {groups.map((group, gi) => (
              <div key={group}>
                {gi > 0 && (
                  <div className="mx-2 my-1 border-t" />
                )}
                {DATE_PRESET_OPTIONS.filter((o) => o.group === group).map(
                  (option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm outline-none hover:bg-accent ${
                        preset === option.value
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "text-foreground"
                      }`}
                      onClick={() => handleSelect(option.value)}
                    >
                      {preset === option.value && (
                        <svg
                          className="h-3.5 w-3.5 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {preset !== option.value && (
                        <span className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {option.label}
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3">
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setShowCustom(false)}
              >
                Back to presets
              </button>
            </div>
            <p className="mb-2 text-xs font-medium text-foreground">From</p>
            <Calendar
              mode="single"
              selected={customFrom}
              onSelect={(d) => onCustomFromChange(d ?? undefined)}
              defaultMonth={customFrom}
              initialFocus
            />
            <p className="mb-2 mt-3 text-xs font-medium text-foreground">To</p>
            <Calendar
              mode="single"
              selected={customTo}
              onSelect={(d) => onCustomToChange(d ?? undefined)}
              defaultMonth={customTo}
            />
            <Button
              size="sm"
              className="mt-3 w-full text-xs"
              onClick={() => setOpen(false)}
            >
              Apply
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ────────────────────────────────────────────────────────────
//  Mock data
// ────────────────────────────────────────────────────────────
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

interface IssuedApplication {
  id: string
  clientName: string
  planType: string
  company: string
  policy: string
  effectiveDate: string
  writtenAs: string
  issuedDate: string
  commissionStatus: CommissionStatus | null
  status: "Active" | "Active (not agent of record)"
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
    commissionStatus: "not_paid",
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
    commissionStatus: "not_paid",
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
    commissionStatus: "not_paid",
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
    commissionStatus: "not_paid",
    status: "Pending (not agent of record)",
  },
]

const MOCK_ISSUED: IssuedApplication[] = [
  {
    id: "i1",
    clientName: "Adams, Sarah",
    planType: "MAPD",
    company: "Anthem",
    policy: "Anthem Medicare Advantage 4 (PPO)",
    effectiveDate: "2026-02-01",
    writtenAs: "New to Medicare",
    issuedDate: "2026-02-03",
    commissionStatus: "paid_full",
    status: "Active",
  },
  {
    id: "i2",
    clientName: "Clark, Thomas",
    planType: "PDP",
    company: "Humana",
    policy: "Humana Walmart Value Rx Plan",
    effectiveDate: "2026-01-15",
    writtenAs: "Like Plan Change",
    issuedDate: "2026-01-18",
    commissionStatus: "paid_full",
    status: "Active",
  },
  {
    id: "i3",
    clientName: "Lewis, Jennifer",
    planType: "MAPD",
    company: "UnitedHealthcare",
    policy: "AARP Medicare Advantage Choice (PPO)",
    effectiveDate: "2026-01-01",
    writtenAs: "Unlike Plan Change",
    issuedDate: "2026-01-05",
    commissionStatus: "partial",
    status: "Active (not agent of record)",
  },
  {
    id: "i4",
    clientName: "Walker, Richard",
    planType: "MAPD",
    company: "Aetna",
    policy: "Aetna Medicare Eagle (PPO)",
    effectiveDate: "2026-02-15",
    writtenAs: "AOR Change",
    issuedDate: "2026-02-18",
    commissionStatus: "trued_up",
    status: "Active",
  },
  {
    id: "i5",
    clientName: "Young, Margaret",
    planType: "PDP",
    company: "SilverScript",
    policy: "SilverScript Choice (PDP)",
    effectiveDate: "2025-12-01",
    writtenAs: "New to Medicare",
    issuedDate: "2025-12-05",
    commissionStatus: "paid_full",
    status: "Active",
  },
  {
    id: "i6",
    clientName: "Hall, David",
    planType: "MAPD",
    company: "Cigna",
    policy: "Cigna True Choice Medicare (PPO)",
    effectiveDate: "2025-12-15",
    writtenAs: "Like Plan Change (same company)",
    issuedDate: "2025-12-18",
    commissionStatus: "chargeback",
    status: "Active",
  },
]

// ────────────────────────────────────────────────────────────
//  Tab types
// ────────────────────────────────────────────────────────────
type ViewTab = "pending" | "issued"
type StatusFilter = "all" | "pending_submitted" | "pending_not_aor"

// ────────────────────────────────────────────────────────────
//  Main component
// ────────────────────────────────────────────────────────────
export default function PendingPageInner() {
  // Shared
  const [activeTab, setActiveTab] = useState<ViewTab>("pending")
  const [search, setSearch] = useState("")

  // Pending state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [applications, setApplications] = useState<PendingApplication[]>(MOCK_PENDING)

  // Issue dialog state
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [issueTargetId, setIssueTargetId] = useState<string | null>(null)
  const [issueSelectedStatus, setIssueSelectedStatus] = useState<CommissionStatus>("not_paid")

  // Issued state
  const [issuedApps, setIssuedApps] = useState<IssuedApplication[]>(MOCK_ISSUED)
  const [datePreset, setDatePreset] = useState<DateRangePreset>("last_60")
  const [customFrom, setCustomFrom] = useState<Date | undefined>(subDays(new Date(), 60))
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date())

  // Filtered pending
  const filteredPending = useMemo(() => {
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

  // Filtered issued (by date range + search)
  const filteredIssued = useMemo(() => {
    const range = getDateRange(datePreset, customFrom, customTo)
    let result = issuedApps.filter((a) => {
      const issued = parseLocalDate(a.issuedDate)
      return isWithinInterval(issued, { start: range.from, end: range.to })
    })
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
    return result
  }, [issuedApps, datePreset, customFrom, customTo, search])

  const handleRequestIssue = useCallback((id: string) => {
    const app = applications.find((a) => a.id === id)
    if (!app) return
    // If already issued, allow un-issuing directly
    if (app.issued) {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, issued: false } : a))
      )
      return
    }
    // Open the dialog to prompt for commission status
    setIssueTargetId(id)
    setIssueSelectedStatus(app.commissionStatus ?? "not_paid")
    setIssueDialogOpen(true)
  }, [applications])

  const handleConfirmIssue = useCallback(() => {
    if (!issueTargetId) return
    const app = applications.find((a) => a.id === issueTargetId)
    if (!app) return

    // Remove from pending
    setApplications((prev) => prev.filter((a) => a.id !== issueTargetId))

    // Add to issued
    const today = format(new Date(), "yyyy-MM-dd")
    setIssuedApps((prev) => [
      {
        id: app.id,
        clientName: app.clientName,
        planType: app.planType,
        company: app.company,
        policy: app.policy,
        effectiveDate: app.effectiveDate,
        writtenAs: app.writtenAs,
        issuedDate: today,
        commissionStatus: issueSelectedStatus,
        status: app.status === "Pending (not agent of record)" ? "Active (not agent of record)" : "Active",
      },
      ...prev,
    ])

    setIssueDialogOpen(false)
    setIssueTargetId(null)
  }, [issueTargetId, issueSelectedStatus, applications])

  const handleCommissionChange = useCallback((id: string, status: CommissionStatus) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, commissionStatus: status } : a))
    )
  }, [])

  const openCmd = () => {
    const fn = (window as unknown as Record<string, unknown>).__openCommandPalette
    if (typeof fn === "function") (fn as () => void)()
  }

  return (
    <>
      <AppHeader title="Pending Applications" onOpenCommandPalette={openCmd} />

      <div className="flex-1 overflow-auto overflow-x-hidden">
        {/* Tabs + Toolbar */}
        <div className="flex flex-col gap-0 border-b">
          {/* Tab bar */}
          <div className="flex items-center gap-0 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors outline-none ${
                activeTab === "pending"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Pending
              <Badge
                variant="secondary"
                className={`ml-1 h-5 min-w-[20px] px-1.5 text-[10px] font-semibold ${
                  activeTab === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : ""
                }`}
              >
                {applications.length}
              </Badge>
              {activeTab === "pending" && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-amber-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("issued")}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors outline-none ${
                activeTab === "issued"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Issued
              <Badge
                variant="secondary"
                className={`ml-1 h-5 min-w-[20px] px-1.5 text-[10px] font-semibold ${
                  activeTab === "issued"
                    ? "bg-emerald-100 text-emerald-700"
                    : ""
                }`}
              >
                {filteredIssued.length}
              </Badge>
              {activeTab === "issued" && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6 border-t bg-muted/30">
            <div className="relative min-w-0 flex-1 md:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "pending"
                    ? "Search pending applications..."
                    : "Search issued policies..."
                }
                className="h-8 pl-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {activeTab === "pending" && (
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
            )}

            {activeTab === "issued" && (
              <DateRangePicker
                preset={datePreset}
                onPresetChange={setDatePreset}
                customFrom={customFrom}
                customTo={customTo}
                onCustomFromChange={setCustomFrom}
                onCustomToChange={setCustomTo}
              />
            )}
          </div>
        </div>

        {/* ── Pending view ── */}
        {activeTab === "pending" && (
          <div className="bg-amber-50/30">
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

            {/* Pending Table */}
            <div className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="min-w-0 overflow-hidden rounded-lg border border-amber-200/60">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-300" />
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
                      {filteredPending.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-32 text-center">
                            <p className="text-sm text-muted-foreground">
                              No pending applications found
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPending.map((app, i) => (
                          <TableRow key={app.id} className={i % 2 === 1 ? "bg-amber-50/40" : ""}>
                            <TableCell className="py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground">
                                  {app.clientName}
                                </span>
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
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {app.planType}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {app.company}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {app.policy}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-foreground">
                                {format(parseLocalDate(app.effectiveDate), "MMM d, yyyy")}
                              </span>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <span className="text-xs text-muted-foreground">{app.writtenAs}</span>
                            </TableCell>
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
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                <CommissionStatusPicker
                                  value={app.commissionStatus}
                                  onChange={(v) => handleCommissionChange(app.id, v)}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={app.issued}
                                  onCheckedChange={() => handleRequestIssue(app.id)}
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
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {filteredPending.length} of {applications.length} pending applications
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Issued view ── */}
        {activeTab === "issued" && (
          <div className="bg-emerald-50/30">
            {/* Summary badges */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
              <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                {filteredIssued.length} Issued
              </Badge>
              {(() => {
                const range = getDateRange(datePreset, customFrom, customTo)
                return (
                  <span className="text-xs text-muted-foreground">
                    {format(range.from, "MMM d, yyyy")} &ndash; {format(range.to, "MMM d, yyyy")}
                  </span>
                )
              })()}
            </div>

            {/* Issued Table */}
            <div className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="min-w-0 overflow-hidden rounded-lg border border-emerald-200/60">
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-300" />
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
                        <TableHead className="hidden lg:table-cell">Issued Date</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead className="text-center">Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssued.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-32 text-center">
                            <p className="text-sm text-muted-foreground">
                              No issued policies found for this date range
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredIssued.map((app, i) => (
                          <TableRow key={app.id} className={i % 2 === 1 ? "bg-emerald-50/40" : ""}>
                            <TableCell className="py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground">
                                  {app.clientName}
                                </span>
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
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {app.planType}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {app.company}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {app.policy}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-foreground">
                                {format(parseLocalDate(app.effectiveDate), "MMM d, yyyy")}
                              </span>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <span className="text-xs text-muted-foreground">{app.writtenAs}</span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-foreground">
                                {format(parseLocalDate(app.issuedDate), "MMM d, yyyy")}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge
                                variant="outline"
                                className={
                                  app.status === "Active"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px]"
                                    : "border-muted text-muted-foreground text-[11px]"
                                }
                              >
                                {app.status === "Active" ? "Active" : "Not AOR"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                <CommissionStatusIcon status={app.commissionStatus} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {filteredIssued.length} issued policies
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Issue confirmation dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Issued</DialogTitle>
            <DialogDescription>
              Select how the commission was paid before marking this application as issued.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-3 text-sm font-medium text-foreground">Commission Status</p>
            <div className="flex flex-col gap-1 rounded-lg border p-1">
              {COMMISSION_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none transition-colors ${
                    issueSelectedStatus === option.value
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                  onClick={() => setIssueSelectedStatus(option.value)}
                >
                  <CommissionStatusIcon status={option.value} />
                  <span>{option.label}</span>
                  {issueSelectedStatus === option.value && (
                    <svg className="ml-auto h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmIssue}>
              Confirm Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
