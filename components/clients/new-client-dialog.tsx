"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AddressForm } from "@/components/clients/address-form"
import { useCRMStore } from "@/lib/store"
import { formatPhoneNumber } from "@/lib/utils"
import { getT65FromDob } from "@/lib/date-utils"
import { goeyToast } from "goey-toast"
import type { ClientAddress, ClientPhone, ClientEmail } from "@/lib/types"

const DEFAULT_SOURCE_OPTIONS = [
  "Website",
  "Facebook",
  "Referral",
  "Call-in",
  "Direct Mail",
  "Event",
  "Other",
]

function createEmptyAddress(): ClientAddress {
  return {
    id: crypto.randomUUID(),
    type: "Home",
    address: "",
    city: "",
    state: "",
    zip: "",
    isPreferred: true,
  }
}

function createEmptyPhone(): ClientPhone {
  return {
    id: crypto.randomUUID(),
    number: "",
    type: "Cell",
    isPreferred: false,
  }
}

function createEmptyEmail(): ClientEmail {
  return {
    id: crypto.randomUUID(),
    value: "",
    isPreferred: false,
  }
}

interface NewClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewClientDialog({ open, onOpenChange }: NewClientDialogProps) {
  const router = useRouter()
  const { addClient, currentAgent, agentCustomSources, addAgentCustomSource } = useCRMStore()
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    source: "",
    phones: [{ ...createEmptyPhone(), isPreferred: true }] as ClientPhone[],
    emails: [{ ...createEmptyEmail(), isPreferred: true }] as ClientEmail[],
    dob: "",
    addresses: [createEmptyAddress()] as ClientAddress[],
    preferredContactMethod: "phone" as "phone" | "email" | "text",
    language: "English",
  })
  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [newSourceValue, setNewSourceValue] = useState("")
  const allSourceOptions = useMemo(() => {
    const custom = agentCustomSources[currentAgent] ?? []
    const combined = [...DEFAULT_SOURCE_OPTIONS, ...custom]
    return [...new Set(combined)]
  }, [currentAgent, agentCustomSources])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName?.trim()) {
      goeyToast.error("First name is required")
      return
    }
    if (!form.lastName?.trim()) {
      goeyToast.error("Last name is required")
      return
    }
    const addr = form.addresses[0]
    if (!addr?.address?.trim() || !addr?.city?.trim()) {
      goeyToast.error("Address is required (street and city)")
      return
    }
    const addresses = form.addresses.map((a) => ({
      ...a,
      isPreferred: form.addresses.length === 1 ? true : a.isPreferred,
    }))
    if (!addresses.length || !addresses.some((a) => a.isPreferred)) {
      addresses[0] = { ...addresses[0], isPreferred: true }
    }

    const phones = form.phones
      .filter((p) => p.number?.trim())
      .map((p, i, arr) => ({
        ...p,
        isPreferred: arr.length === 1 ? true : (p.isPreferred ?? (i === 0 && !form.phones.some((x) => x.isPreferred))),
      }))
    if (phones.length && !phones.some((p) => p.isPreferred)) phones[0] = { ...phones[0], isPreferred: true }

    const emails = form.emails
      .filter((e) => e.value?.trim())
      .map((e, i, arr) => ({
        ...e,
        isPreferred: arr.length === 1 ? true : (e.isPreferred ?? (i === 0 && !form.emails.some((x) => x.isPreferred))),
      }))
    if (emails.length && !emails.some((e) => e.isPreferred)) emails[0] = { ...emails[0], isPreferred: true }

    const dobStr = form.dob || "1961-01-01"
    const clientId = crypto.randomUUID()

    addClient({
      id: clientId,
      firstName: form.firstName,
      lastName: form.lastName,
      source: form.source.trim() || undefined,
      phones: phones.length ? phones : [{ ...createEmptyPhone(), isPreferred: true }],
      emails: emails.length ? emails : [{ ...createEmptyEmail(), isPreferred: true }],
      dob: dobStr,
      addresses,
      turning65Date: getT65FromDob(dobStr),
      preferredContactMethod: form.preferredContactMethod,
      language: form.language,
      medicareNumber: "",
      partAEffectiveDate: "",
      partBEffectiveDate: "",
      doctors: [],
      medications: [],
      pharmacies: [],
      allergies: [],
      conditions: [],
      healthTracker: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setForm({
      firstName: "",
      lastName: "",
      source: "",
      phones: [{ ...createEmptyPhone(), isPreferred: true }],
      emails: [{ ...createEmptyEmail(), isPreferred: true }],
      dob: "",
      addresses: [createEmptyAddress()],
      preferredContactMethod: "phone",
      language: "English",
    })
    onOpenChange(false)
    router.push(`/clients/${clientId}?new=1`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => {
          if ((e.target as Element).closest?.("[data-address-autocomplete-listbox]")) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2 pr-10">
          <DialogTitle>New Client</DialogTitle>
          <DialogDescription>Add a new client to your book of business.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
          <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-firstName">First Name</Label>
              <Input
                id="c-firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="Mary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-lastName">Last Name</Label>
              <Input
                id="c-lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Adams"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-source">Source</Label>
            <div className="flex gap-2">
              <Select
                value={form.source || "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, source: v === "__none__" ? "" : v })
                }
              >
                <SelectTrigger id="c-source" className="flex-1">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {allSourceOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  {form.source &&
                    !allSourceOptions.includes(form.source) && (
                      <SelectItem value={form.source}>
                        {form.source}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
              <Popover open={addSourceOpen} onOpenChange={setAddSourceOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="default">
                    Add Source
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Add a new source. It will be saved for your account and appear in the dropdown.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. LinkedIn"
                        value={newSourceValue}
                        onChange={(e) => setNewSourceValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            const v = newSourceValue.trim()
                            if (v) {
                              addAgentCustomSource(currentAgent, v)
                              setForm((prev) => ({ ...prev, source: v }))
                              setNewSourceValue("")
                              setAddSourceOpen(false)
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          const v = newSourceValue.trim()
                          if (v) {
                            addAgentCustomSource(currentAgent, v)
                            setForm((prev) => ({ ...prev, source: v }))
                            setNewSourceValue("")
                            setAddSourceOpen(false)
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Phone</Label>
            <Input
              id="c-phone"
              value={form.phones[0]?.number ?? ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                const formatted = formatPhoneNumber(digits)
                setForm((prev) => ({
                  ...prev,
                  phones: [{ ...prev.phones[0], id: prev.phones[0]?.id ?? crypto.randomUUID(), number: formatted, type: "Cell", isPreferred: true }],
                }))
              }}
              placeholder="(555) 123-4567"
              inputMode="numeric"
              maxLength={14}
              autoComplete="tel"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={form.emails[0]?.value ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  emails: [{ ...prev.emails[0], id: prev.emails[0]?.id ?? crypto.randomUUID(), value: e.target.value, isPreferred: true }],
                }))
              }
              placeholder="mary@email.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-dob">Date of Birth</Label>
            <Input
              id="c-dob"
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <AddressForm
              address={form.addresses[0]}
              onChange={(patch) =>
                setForm((prev) => ({
                  ...prev,
                  addresses: [{ ...prev.addresses[0], ...patch }],
                }))
              }
              showType={false}
              showPreferred={false}
              allowManualEntry={true}
              dialogOpen={open}
            />
          </div>
          </div>
          </div>
          <DialogFooter className="shrink-0 px-6 py-4 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Client</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
