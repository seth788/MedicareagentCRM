"use client"

import { Trash2 } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ClientAddress } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface AddressCardProps {
  address: ClientAddress
  onEdit?: () => void
  onRemove?: () => void
  /** When true, the Preferred badge is hidden (e.g. when there is only one address). */
  hidePreferredWhenOnlyOne?: boolean
  className?: string
}

export function AddressCard({ address, onEdit, onRemove, hidePreferredWhenOnlyOne, className }: AddressCardProps) {
  const line1 = [address.address, address.unit].filter(Boolean).join(", ")
  const line2 = [address.city, address.county, address.state, address.zip].filter(Boolean).join(", ")
  const fullAddress = [line1, line2].filter(Boolean).join(", ")
  const showPreferred = address.isPreferred && !hidePreferredWhenOnlyOne

  return (
    <div
      role={onEdit ? "button" : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onKeyDown={onEdit ? (e) => e.key === "Enter" && onEdit() : undefined}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3",
        onEdit && "cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      onClick={onEdit}
    >
      <Badge variant="secondary" className="shrink-0 text-xs">
        {address.type}
      </Badge>
      <div className="min-w-0 flex-1 text-sm text-foreground">
        {fullAddress}
      </div>
      {showPreferred && (
        <Badge variant="outline" className="shrink-0 text-xs border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Preferred
        </Badge>
      )}
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove address</span>
        </Button>
      )}
    </div>
  )
}
