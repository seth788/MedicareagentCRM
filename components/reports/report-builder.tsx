"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import {
  FILTER_FIELD_DEFINITIONS,
  formatMultiselectValue,
  getFilterLabel,
  getValueLabel,
  parseMultiselectValue,
  filtersToStoredFormat,
  type ReportFilter,
  type ReportFilterField,
  type FilterGroup,
} from "@/lib/report-filters"
import { Info, Search, X, ChevronDown, Trash2, Star } from "@/components/icons"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

const GROUP_LABELS: Record<FilterGroup, string> = {
  individual: "Individual",
  address: "Address",
  provider: "Provider",
  pharmacy: "Pharmacy",
  rx: "Rx",
  policy: "Policy",
}

interface ReportBuilderProps {
  filters: ReportFilter[]
  onFiltersChange: (filters: ReportFilter[]) => void
  onRunReport: () => void
  onReportSaved?: () => void
  runReportDisabled?: boolean
  pharmacyOptions?: string[]
  rxOptions?: string[]
  sourceOptions?: string[]
  healthTrackerOptions?: string[]
  languageOptions?: string[]
  cityOptions?: string[]
  stateOptions?: string[]
  zipOptions?: string[]
  countyOptions?: string[]
  carrierOptions?: string[]
}

export function ReportBuilder({
  filters,
  onFiltersChange,
  onRunReport,
  onReportSaved,
  runReportDisabled = false,
  pharmacyOptions = [],
  rxOptions = [],
  sourceOptions = [],
  healthTrackerOptions = [],
  languageOptions = [],
  cityOptions = [],
  stateOptions = [],
  zipOptions = [],
  countyOptions = [],
  carrierOptions = [],
}: ReportBuilderProps) {
  const [addField, setAddField] = useState<ReportFilterField | "">("")
  const [addValue, setAddValue] = useState("")
  const [addValueTo, setAddValueTo] = useState("")
  const [addRowMultiselectSearch, setAddRowMultiselectSearch] = useState("")
  const [unrefinedError, setUnrefinedError] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [saving, setSaving] = useState(false)

  const defs = FILTER_FIELD_DEFINITIONS
  const groupedDefs = useMemo(() => {
    const groups = new Map<FilterGroup, typeof defs>()
    for (const d of defs) {
      const g = d.group ?? "individual"
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(d)
    }
    return groups
  }, [])

  const clientDataOptions: Partial<Record<ReportFilterField, string[]>> = {
    pharmacy_name: pharmacyOptions,
    rx_name: rxOptions,
    client_source: sourceOptions,
    client_health_tracker: healthTrackerOptions,
    client_language: languageOptions,
    address_city: cityOptions,
    address_state: stateOptions,
    address_zip: zipOptions,
    address_county: countyOptions,
    coverage_carrier: carrierOptions,
  }

  function getOptionsForField(field: ReportFilterField) {
    const def = defs.find((d) => d.field === field)
    if (!def || def.type !== "multiselect") return []
    if (def.options) return [...def.options]
    const opts = clientDataOptions[field]
    return opts ? opts.map((v) => ({ value: v, label: v })) : []
  }

  function updateFilter(id: string, updates: Partial<ReportFilter>) {
    onFiltersChange(
      filters.map((f) => (f.id === id ? { ...f, ...updates } : f))
    )
  }

  function updateFilterValue(id: string, value: string, valueTo?: string) {
    const f = filters.find((x) => x.id === id)
    if (!f) return
    const label = getFilterLabel(f.field, value, valueTo)
    updateFilter(id, { value, valueTo, label })
  }

  function removeRefineChip(filterId: string, valueToRemove: string) {
    const f = filters.find((x) => x.id === filterId)
    if (!f) return
    const vals = parseMultiselectValue(f.value).filter((v) => v !== valueToRemove)
    if (vals.length === 0) {
      handleRemoveFilter(filterId)
    } else {
      updateFilterValue(filterId, formatMultiselectValue(vals))
    }
  }

  function addRefineChip(filterId: string, valueToAdd: string) {
    const f = filters.find((x) => x.id === filterId)
    if (!f) return
    const vals = [...parseMultiselectValue(f.value), valueToAdd]
    updateFilterValue(filterId, formatMultiselectValue(vals))
  }

  function commitAddRow() {
    const def = defs.find((d) => d.field === addField)
    if (!addField || !def) return false

    if (def.type === "date_range") {
      const from = addValue
      const to = addValueTo
      if (!from && !to) return false
      const id = `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const label = getFilterLabel(addField, from, to)
      onFiltersChange([
        ...filters,
        { id, field: addField, value: from, valueTo: to || undefined, label },
      ])
      setAddField("")
      setAddValue("")
      setAddValueTo("")
      setUnrefinedError(false)
      return true
    }

    if (def.type === "multiselect") {
      const selected = parseMultiselectValue(addValue)
      if (!selected.length) return false
      const id = `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const label = getFilterLabel(addField, addValue)
      onFiltersChange([...filters, { id, field: addField, value: addValue, label }])
      setAddField("")
      setAddValue("")
      setAddValueTo("")
      setUnrefinedError(false)
      return true
    }

    const value = addValue.trim()
    if (!value) return false
    const id = `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const label = getFilterLabel(addField, value)
    onFiltersChange([...filters, { id, field: addField, value, label }])
    setAddField("")
    setAddValue("")
    setAddValueTo("")
    setUnrefinedError(false)
    return true
  }


  function handleRemoveFilter(id: string) {
    onFiltersChange(filters.filter((f) => f.id !== id))
  }

  function handleClear() {
    onFiltersChange([])
    setAddField("")
    setAddValue("")
    setAddValueTo("")
    setUnrefinedError(false)
  }

  const addRowDef = addField ? defs.find((d) => d.field === addField) : null
  const addRowMultiselectSelected = parseMultiselectValue(addValue)
  const needsRefine =
    addField &&
    addRowDef &&
    (addRowDef.type === "date_range"
      ? !addValue && !addValueTo
      : addRowDef.type === "multiselect"
        ? !addRowMultiselectSelected.length
        : !addValue.trim())

  function handleRunReport() {
    if (needsRefine) {
      setUnrefinedError(true)
      return
    }
    setUnrefinedError(false)
    onRunReport()
  }

  async function handleSaveReport() {
    const name = saveName.trim()
    if (!name || filters.length === 0) return
    setSaving(true)
    try {
      const res = await fetch("/api/saved-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          filters: filtersToStoredFormat(filters),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? "Failed to save report")
      }
      setSaveDialogOpen(false)
      setSaveName("")
      onReportSaved?.()
      toast.success("Report saved to Quick Reports")
    } catch (e) {
      console.error("Save report failed", e)
      toast.error(e instanceof Error ? e.message : "Failed to save report")
    } finally {
      setSaving(false)
    }
  }

  function openSaveDialog() {
    if (filters.length === 0) return
    setSaveName("")
    setSaveDialogOpen(true)
  }

  const filterSelect = (
    value: ReportFilterField | "",
    onChange: (v: ReportFilterField) => void,
    options?: { resetAddState?: boolean }
  ) => (
    <Select
      value={value || "__none__"}
      onValueChange={(v) => {
        const field = (v === "__none__" ? "" : v) as ReportFilterField
        onChange(field)
        if (options?.resetAddState) {
          setAddValue("")
          setAddValueTo("")
          setUnrefinedError(false)
        }
      }}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
        <SelectContent>
        <SelectItem value="__none__">Select...</SelectItem>
        {(["individual", "address", "provider", "pharmacy", "rx", "policy"] as const).map(
          (group) =>
            groupedDefs.get(group)?.length ? (
              <SelectGroup key={group}>
                <SelectLabel>— {GROUP_LABELS[group]} —</SelectLabel>
                {groupedDefs.get(group)!.map((d) => (
                    <SelectItem key={d.field} value={d.field}>
                      {d.label}
                    </SelectItem>
                  ))}
              </SelectGroup>
            ) : null
        )}
      </SelectContent>
    </Select>
  )

  const updateFilterField = (filterId: string, field: ReportFilterField) => {
    const def = defs.find((d) => d.field === field)
    updateFilter(filterId, {
      field,
      value: "",
      valueTo: undefined,
      label: def?.label ?? "",
    })
  }

  function RefineMultiselect({
    filter,
    options,
  }: {
    filter: ReportFilter
    options: { value: string; label: string }[]
  }) {
    const [search, setSearch] = useState("")
    const selected = parseMultiselectValue(filter.value)
    // Include selected values that may not be in options (e.g. from older data)
    const selectedNotInOptions = selected.filter(
      (value) => !options.some((o) => o.value === value)
    )
    const allOptions: { value: string; label: string }[] = [
      ...options,
      ...selectedNotInOptions.map((value) => ({
        value,
        label: getValueLabel(filter.field, value),
      })),
    ]
    const searchLower = search.trim().toLowerCase()
    const filteredOptions = searchLower
      ? allOptions.filter(
          (o) =>
            o.label.toLowerCase().includes(searchLower) ||
            o.value.toLowerCase().includes(searchLower)
        )
      : allOptions

    return (
      <div className="flex min-w-[180px] flex-1 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5">
        {selected.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs"
          >
            {getValueLabel(filter.field, val)}
            <button
              type="button"
              aria-label={`Remove ${getValueLabel(filter.field, val)}`}
              onClick={() => removeRefineChip(filter.id, val)}
              className="rounded p-0.5 hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Popover onOpenChange={(open) => !open && setSearch("")}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 shrink-0 p-0">
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <div className="border-b p-2">
              <Input
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="max-h-[220px] overflow-y-auto overflow-x-hidden">
              <div className="space-y-1 p-2">
                {allOptions.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    No options available.
                  </p>
                ) : filteredOptions.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    No matches found.
                  </p>
                ) : (
                  filteredOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                    >
                      <Checkbox
                        checked={selected.includes(opt.value)}
                        onCheckedChange={(checked) => {
                          if (checked) addRefineChip(filter.id, opt.value)
                          else removeRefineChip(filter.id, opt.value)
                        }}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Report Builder</h3>

      <div className="space-y-3">
        <div className="grid grid-cols-[200px_1fr_32px] items-start gap-3 text-xs">
          <span className="font-medium text-muted-foreground">Filter by</span>
          <span className="font-medium text-muted-foreground">Refine</span>
          <span />
        </div>

        {filters.map((filter) => {
          const def = defs.find((d) => d.field === filter.field)
          if (!def) return null
          const options = getOptionsForField(filter.field)

          return (
            <div
              key={filter.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3"
            >
              <div className="min-w-0">
                {filterSelect(filter.field, (v) => updateFilterField(filter.id, v))}
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2">
                {def.type === "multiselect" ? (
                  <RefineMultiselect filter={filter} options={options} />
                ) : def.type === "date_range" ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">From</span>
                      <DatePicker
                        value={filter.value}
                        onChange={(v) =>
                          updateFilterValue(filter.id, v, filter.valueTo)
                        }
                        placeholder="Pick date"
                        className="w-[130px]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">To</span>
                      <DatePicker
                        value={filter.valueTo ?? ""}
                        onChange={(v) =>
                          updateFilterValue(filter.id, filter.value, v)
                        }
                        placeholder="Pick date"
                        className="w-[130px]"
                      />
                    </div>
                  </div>
                ) : (
                  <Input
                    value={filter.value}
                    onChange={(e) =>
                      updateFilterValue(filter.id, e.target.value)
                    }
                    placeholder="Enter value..."
                    className="min-w-[140px] max-w-[240px]"
                  />
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Remove filter"
                onClick={() => handleRemoveFilter(filter.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        })}

        {/* Add new filter row */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <div className="min-w-0">
            {filterSelect(addField, setAddField, { resetAddState: true })}
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            {addRowDef?.type === "date_range" ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">From</span>
                  <DatePicker
                    value={addValue}
                    onChange={(v) => {
                      setAddValue(v)
                      setUnrefinedError(false)
                    }}
                    placeholder="Pick date"
                    className="w-[130px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">To</span>
                  <DatePicker
                    value={addValueTo}
                    onChange={(v) => {
                      setAddValueTo(v)
                      setUnrefinedError(false)
                    }}
                    placeholder="Pick date"
                    className="w-[130px]"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => commitAddRow()}
                  disabled={!addValue && !addValueTo}
                >
                  Add
                </Button>
              </div>
            ) : addRowDef?.type === "multiselect" ? (
              <Popover
                onOpenChange={(open) => {
                  if (!open) setAddRowMultiselectSearch("")
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-w-[180px] justify-between font-normal"
                  >
                    <span className="truncate">
                      {addRowMultiselectSelected.length
                        ? addRowMultiselectSelected
                            .map((v) => getValueLabel(addField, v))
                            .join(", ")
                        : "Select..."}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0" align="start">
                  <div className="border-b p-2">
                    <Input
                      placeholder="Search"
                      value={addRowMultiselectSearch}
                      onChange={(e) => setAddRowMultiselectSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="max-h-[260px] overflow-y-auto overflow-x-hidden">
                    <div className="space-y-1 p-2">
                      {(() => {
                        const opts = getOptionsForField(addField)
                        if (opts.length === 0) {
                          return (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              No options available.
                            </p>
                          )
                        }
                        const searchLower = addRowMultiselectSearch.trim().toLowerCase()
                        const filtered = searchLower
                          ? opts.filter(
                              (o) =>
                                o.label.toLowerCase().includes(searchLower) ||
                                o.value.toLowerCase().includes(searchLower)
                            )
                          : opts
                        if (filtered.length === 0) {
                          return (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              No matches found.
                            </p>
                          )
                        }
                        return filtered.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                          >
                            <Checkbox
                              checked={addRowMultiselectSelected.includes(opt.value)}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...addRowMultiselectSelected, opt.value]
                                  : addRowMultiselectSelected.filter((o) => o !== opt.value)
                                setAddValue(formatMultiselectValue(next))
                                setUnrefinedError(false)
                              }}
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        ))
                      })()}
                    </div>
                  </div>
                  <div className="border-t p-2">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      onClick={() => commitAddRow()}
                      disabled={!addRowMultiselectSelected.length}
                    >
                      Add filter
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : addRowDef?.type === "text" ? (
              <Input
                placeholder="Enter value..."
                value={addValue}
                onChange={(e) => {
                  setAddValue(e.target.value)
                  setUnrefinedError(false)
                }}
                onBlur={() => commitAddRow()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitAddRow()
                }}
                className="min-w-[140px] max-w-[240px]"
              />
            ) : null}
          </div>

          <span className="w-8" />
        </div>
      </div>

      {unrefinedError && (
        <p className="text-sm text-destructive">
          Please refine your filter selection before running the report.
        </p>
      )}

      {addRowDef?.tip && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>{addRowDef.tip}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={handleRunReport}
          disabled={runReportDisabled}
          className="min-h-[36px]"
        >
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Run Report
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={openSaveDialog}
          disabled={filters.length === 0}
          className="min-h-[36px]"
        >
          <Star className="mr-1.5 h-3.5 w-3.5" />
          Save to Quick Reports
        </Button>
        <Button size="sm" variant="outline" onClick={handleClear} className="min-h-[36px]">
          <X className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report to Quick Reports</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="save-report-name" className="text-sm font-medium">
              Report name
            </label>
            <Input
              id="save-report-name"
              placeholder="e.g. Active MAPD clients in Phoenix"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveReport()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveReport}
              disabled={!saveName.trim() || saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
