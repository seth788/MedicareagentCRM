"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import type { ClientAddress, AddressType } from "@/lib/types"
import { cn } from "@/lib/utils"

const ADDRESS_TYPES: { value: AddressType; label: string }[] = [
  { value: "Home", label: "Home" },
  { value: "Mailing", label: "Mailing" },
  { value: "Secondary Home", label: "Secondary Home" },
  { value: "Secondary Mailing", label: "Secondary Mailing" },
]

export interface AddressFormProps {
  address: Partial<ClientAddress>
  onChange: (address: Partial<ClientAddress>) => void
  onRemove?: () => void
  showType?: boolean
  showPreferred?: boolean
  allowManualEntry?: boolean
  dialogOpen?: boolean
  className?: string
}

const emptyAddress = (): Partial<ClientAddress> => ({
  address: "",
  unit: "",
  city: "",
  state: "",
  zip: "",
  type: "Home",
  isPreferred: false,
})

export function AddressForm({
  address: initial,
  onChange,
  onRemove,
  showType = true,
  showPreferred = false,
  allowManualEntry = true,
  dialogOpen = true,
  className,
}: AddressFormProps) {
  const [manualMode, setManualMode] = useState(false)
  const addr = { ...emptyAddress(), ...initial }

  const update = (patch: Partial<ClientAddress>) => {
    onChange({ ...addr, ...patch })
  }

  const handlePlaceSelect = (result: { address: string; city: string; state: string; zip: string }) => {
    update({
      address: result.address,
      city: result.city,
      state: result.state,
      zip: result.zip,
    })
  }

  return (
    <div className={cn("space-y-3 rounded-lg border p-4", className)}>
      {showType && (
        <div className="space-y-1.5">
          <Label>Address type</Label>
          <Select
            value={addr.type ?? "Home"}
            onValueChange={(v) => update({ type: v as AddressType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADDRESS_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Street or PO Box</Label>
        {manualMode && allowManualEntry ? (
          <Input
            value={addr.address ?? ""}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="123 Main St or PO Box 456"
          />
        ) : (
          <AddressAutocomplete
            value={addr.address ?? ""}
            onChange={(e) => update({ address: e.target.value })}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Start typing address..."
            dialogOpen={dialogOpen}
          />
        )}
        {allowManualEntry && (
          <p className="text-xs text-muted-foreground">
            {manualMode ? (
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="text-primary hover:underline"
              >
                Use address autocomplete instead
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="text-primary hover:underline"
              >
                Or enter manually (e.g. PO Box)
              </button>
            )}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="unit">Unit (optional)</Label>
        <Input
          id="unit"
          value={addr.unit ?? ""}
          onChange={(e) => update({ unit: e.target.value })}
          placeholder="Apt, Unit, Suite"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>City</Label>
          <Input
            value={addr.city ?? ""}
            onChange={(e) => update({ city: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>State</Label>
          <Input
            value={addr.state ?? ""}
            onChange={(e) => update({ state: e.target.value })}
            maxLength={2}
            placeholder="IL"
          />
        </div>
        <div className="space-y-1.5">
          <Label>ZIP</Label>
          <Input
            value={addr.zip ?? ""}
            onChange={(e) => update({ zip: e.target.value })}
            placeholder="62701"
          />
        </div>
      </div>

      {showPreferred && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="preferred"
            checked={addr.isPreferred ?? false}
            onCheckedChange={(checked) => update({ isPreferred: !!checked })}
          />
          <Label htmlFor="preferred" className="cursor-pointer font-normal">
            Use as preferred address
          </Label>
        </div>
      )}

      {onRemove && (
        <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
          Remove address
        </Button>
      )}
    </div>
  )
}
