"use client"

import * as React from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { parseLocalDate } from "@/lib/date-utils"

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function toMonthString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export interface DatePickerProps {
  /** Value as YYYY-MM-DD (full date) or YYYY-MM (month-only) */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** When true, value/onChange use YYYY-MM format (e.g. Part A/B effective dates) */
  monthOnly?: boolean
  id?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  monthOnly = false,
  id,
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const date = React.useMemo(() => {
    if (!value?.trim()) return undefined
    if (monthOnly) {
      const m = value.match(/^(\d{4})-(\d{2})$/)
      if (!m) return undefined
      return new Date(Number(m[1]), Number(m[2]) - 1, 1, 12, 0, 0)
    }
    return parseLocalDate(value)
  }, [value, monthOnly])

  const isValidDate = date && !Number.isNaN(date.getTime())

  const handleSelect = React.useCallback(
    (d: Date | undefined) => {
      if (!d) {
        onChange("")
        return
      }
      if (monthOnly) {
        onChange(toMonthString(d))
      } else {
        onChange(toLocalDateString(d))
      }
      setOpen(false)
    },
    [onChange, monthOnly]
  )

  const displayValue = React.useMemo(() => {
    if (!isValidDate) return ""
    if (monthOnly) {
      return format(date!, "MMM yyyy")
    }
    return format(date!, "MMM d, yyyy")
  }, [date, isValidDate, monthOnly])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "w-full justify-start font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={isValidDate ? date! : undefined}
          onSelect={handleSelect}
          defaultMonth={isValidDate ? date : new Date()}
          initialFocus
          captionLayout="dropdown-buttons"
          fromYear={1900}
          toYear={new Date().getFullYear() + 10}
          formatters={{
            formatMonthCaption: (month) => format(month, "MMM"),
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
