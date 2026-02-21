"use client"

import { useState } from "react"
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
import { AddressForm } from "@/components/clients/address-form"
import { useCRMStore } from "@/lib/store"
import { getT65FromDob } from "@/lib/date-utils"
import { goeyToast } from "goey-toast"
import type { ClientAddress, ClientPhone, ClientEmail, ClientPhoneType } from "@/lib/types"

const PHONE_TYPES: ClientPhoneType[] = ["Cell", "Home", "Work", "Other"]

function createEmptyAddress(): ClientAddress {
  return {
    id: `addr-${Date.now()}`,
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
    id: `phone-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    number: "",
    type: "Cell",
    isPreferred: false,
  }
}

function createEmptyEmail(): ClientEmail {
  return {
    id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    value: "",
    isPreferred: false,
  }
}

interface NewClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewClientDialog({ open, onOpenChange }: NewClientDialogProps) {
  const { addClient } = useCRMStore()
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phones: [{ ...createEmptyPhone(), isPreferred: true }] as ClientPhone[],
    emails: [{ ...createEmptyEmail(), isPreferred: true }] as ClientEmail[],
    dob: "",
    addresses: [createEmptyAddress()] as ClientAddress[],
    preferredContactMethod: "phone" as "phone" | "email" | "text",
    language: "English",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName) {
      goeyToast.error("First and last name are required")
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

    addClient({
      id: `client-${Date.now()}`,
      firstName: form.firstName,
      lastName: form.lastName,
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
    goeyToast.success("Client created", {
      description: `${form.firstName} ${form.lastName} has been added`,
    })
    setForm({
      firstName: "",
      lastName: "",
      phones: [{ ...createEmptyPhone(), isPreferred: true }],
      emails: [{ ...createEmptyEmail(), isPreferred: true }],
      dob: "",
      addresses: [createEmptyAddress()],
      preferredContactMethod: "phone",
      language: "English",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Client</DialogTitle>
          <DialogDescription>Add a new client to your book of business.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
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
          <div className="space-y-3">
            <Label>Contact</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {form.phones.map((phone, index) => (
                  <div key={phone.id} className="space-y-1">
                    <div className="flex gap-2 items-start">
                      <Select
                        value={phone.type}
                        onValueChange={(v) => {
                          const next = form.phones.map((p, i) =>
                            i === index ? { ...p, type: v as ClientPhoneType } : p
                          )
                          setForm((prev) => ({ ...prev, phones: next }))
                        }}
                      >
                        <SelectTrigger className="w-[90px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PHONE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={phone.number}
                        onChange={(e) => {
                          const next = form.phones.map((p, i) =>
                            i === index ? { ...p, number: e.target.value } : p
                          )
                          setForm((prev) => ({ ...prev, phones: next }))
                        }}
                        placeholder="(555) 123-4567"
                        className="flex-1 min-w-0"
                      />
                      {form.phones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const next = form.phones.filter((_, i) => i !== index)
                            if (phone.isPreferred && next.length) next[0] = { ...next[0], isPreferred: true }
                            setForm((prev) => ({ ...prev, phones: next }))
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {form.phones.length > 1 && (
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="radio"
                          name="new-preferred-phone"
                          checked={phone.isPreferred}
                          onChange={() => {
                            const next = form.phones.map((p, i) => ({ ...p, isPreferred: i === index }))
                            setForm((prev) => ({ ...prev, phones: next }))
                          }}
                        />
                        Preferred
                      </label>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, phones: [...prev.phones, createEmptyPhone()] }))}
                >
                  Add phone
                </Button>
              </div>
              <div className="space-y-2">
                {form.emails.map((email, index) => (
                  <div key={email.id} className="space-y-1">
                    <div className="flex gap-2 items-start">
                      <Input
                        type="email"
                        value={email.value}
                        onChange={(ev) => {
                          const next = form.emails.map((em, i) =>
                            i === index ? { ...em, value: ev.target.value } : em
                          )
                          setForm((prev) => ({ ...prev, emails: next }))
                        }}
                        placeholder="mary@email.com"
                        className="flex-1 min-w-0"
                      />
                      {form.emails.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const next = form.emails.filter((_, i) => i !== index)
                            if (email.isPreferred && next.length) next[0] = { ...next[0], isPreferred: true }
                            setForm((prev) => ({ ...prev, emails: next }))
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {form.emails.length > 1 && (
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="radio"
                          name="new-preferred-email"
                          checked={email.isPreferred}
                          onChange={() => {
                            const next = form.emails.map((e, i) => ({ ...e, isPreferred: i === index }))
                            setForm((prev) => ({ ...prev, emails: next }))
                          }}
                        />
                        Preferred
                      </label>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, emails: [...prev.emails, createEmptyEmail()] }))}
                >
                  Add email
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Preferred Contact</Label>
              <Select
                value={form.preferredContactMethod}
                onValueChange={(v) =>
                  setForm({ ...form, preferredContactMethod: v as "phone" | "email" | "text" })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <DialogFooter className="pt-2">
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
