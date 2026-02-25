"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AddressForm } from "@/components/clients/address-form"
import { AddressCard } from "@/components/clients/address-card"
import { useCRMStore } from "@/lib/store"
import { getT65FromDob, effectiveDateToMonthValue, monthValueToEffectiveDate } from "@/lib/date-utils"
import { getPreferredOrFirstAddress, getPreferredOrFirstPhone, getPreferredOrFirstEmail, formatPhoneNumber } from "@/lib/utils"
import { toast } from "sonner"
import type { Client, ClientAddress } from "@/lib/types"

/** Clients that can be chosen as spouse. Today: all except current; later filter by current user's clients (auth). */
function getClientsEligibleForSpouseLink(
  clients: Client[],
  currentClientId: string,
  _currentAgent: string
): Client[] {
  return clients.filter((c) => c.id !== currentClientId)
}

function createEmptyAddress(): ClientAddress {
  return {
    id: crypto.randomUUID(),
    type: "Home",
    address: "",
    city: "",
    county: "",
    state: "",
    zip: "",
    isPreferred: false,
  }
}

export type EditClientSection = "personal" | "contact" | "addresses" | "medicare" | "quick"

interface EditClientDialogProps {
  client: Client
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, only this section is shown and updated. When undefined, show all (header Edit). */
  section?: EditClientSection | null
}


const DEFAULT_SOURCE_OPTIONS = [
  "Website",
  "Facebook",
  "Referral",
  "Call-in",
  "Direct Mail",
  "Event",
  "Other",
]

const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "Mandarin",
  "Cantonese",
  "Vietnamese",
  "Korean",
  "Tagalog",
  "Russian",
  "Arabic",
  "French",
  "Portuguese",
  "Hindi",
  "Polish",
  "Italian",
  "German",
  "Other",
]

export function EditClientDialog({
  client,
  open,
  onOpenChange,
  section: sectionProp = null,
}: EditClientDialogProps) {
  const { clients, currentAgent, updateClient, addActivity, agentCustomSources, addAgentCustomSource } = useCRMStore()
  const section = sectionProp ?? null
  const [form, setForm] = useState({
    title: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    nickname: "",
    gender: "" as "" | "M" | "F",
    funFacts: "",
    addresses: [] as ClientAddress[],
    dob: "",
    language: "English",
    preferredContactMethod: "phone" as "phone" | "email" | "text",
    preferredPhoneNumber: "",
    preferredEmailValue: "",
    spouseId: null as string | null,
    source: "",
    medicareNumber: "",
    partAEffectiveDate: "",
    partBEffectiveDate: "",
  })
  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [newSourceValue, setNewSourceValue] = useState("")
  const allSourceOptions = useMemo(() => {
    const custom = agentCustomSources[currentAgent] ?? []
    const combined = [...DEFAULT_SOURCE_OPTIONS, ...custom]
    return [...new Set(combined)]
  }, [currentAgent, agentCustomSources])
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null)
  const [alsoUpdateSpouseAddresses, setAlsoUpdateSpouseAddresses] = useState(false)
  const [loadingMedicareNumber, setLoadingMedicareNumber] = useState(false)
  const eligibleClients = useMemo(
    () => getClientsEligibleForSpouseLink(clients, client.id, currentAgent),
    [clients, client.id, currentAgent]
  )

  useEffect(() => {
    if (open && client) {
      const isQuick = section === "quick"
      const prefAddr = getPreferredOrFirstAddress(client)
      const prefPhone = getPreferredOrFirstPhone(client)
      const prefEmail = getPreferredOrFirstEmail(client)
      setForm({
        title: client.title || "",
        firstName: client.firstName,
        middleName: client.middleName || "",
        lastName: client.lastName,
        suffix: client.suffix || "",
        nickname: client.nickname || "",
        gender: client.gender || "",
        funFacts: client.funFacts || "",
        addresses:
          isQuick
            ? prefAddr ? [{ ...prefAddr, id: prefAddr.id || crypto.randomUUID() }] : []
            : client.addresses?.length > 0
              ? client.addresses.map((a) => ({ ...a, id: a.id || crypto.randomUUID() }))
              : [{ ...createEmptyAddress(), isPreferred: true }],
        dob: client.dob?.includes("T") ? client.dob.slice(0, 10) : client.dob || "",
        language: client.language || "English",
        preferredContactMethod: client.preferredContactMethod,
        preferredPhoneNumber: prefPhone?.number ?? "",
        preferredEmailValue: prefEmail?.value ?? "",
        spouseId: client.spouseId ?? null,
        source: client.source || "",
        medicareNumber: client.medicareNumber || "",
        partAEffectiveDate: effectiveDateToMonthValue(client.partAEffectiveDate),
        partBEffectiveDate: effectiveDateToMonthValue(client.partBEffectiveDate),
      })
      setEditingAddressIndex(null)
      setAlsoUpdateSpouseAddresses(false)
    }
  }, [open, client, section])

  // Pre-fill Medicare number when opening Medicare section and client has MBI on file (reveal API)
  useEffect(() => {
    if (!open || section !== "medicare" || !client?.id || !client?.hasMedicareNumber) {
      setLoadingMedicareNumber(false)
      return
    }
    let cancelled = false
    setLoadingMedicareNumber(true)
    fetch(`/api/clients/${client.id}/reveal-mbi`)
      .then((res) => {
        if (!res.ok) return null
        return res.json() as Promise<{ medicareNumber?: string }>
      })
      .then((data) => {
        if (cancelled) return
        setForm((prev) => ({ ...prev, medicareNumber: data?.medicareNumber ?? "" }))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingMedicareNumber(false)
      })
    return () => {
      cancelled = true
      setLoadingMedicareNumber(false)
    }
  }, [open, section, client?.id, client?.hasMedicareNumber])

  const showPersonal = section === null || section === "personal" || section === "quick"
  const showContact = section === null || section === "contact" || section === "quick"
  const showAddresses = section === null || section === "addresses" || section === "quick"
  const showMedicare = section === null || section === "medicare"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (showPersonal && (!form.firstName.trim() || !form.lastName.trim())) {
      toast.error("First and last name are required")
      return
    }

    const dobStr = form.dob || client.dob || ""

    const updates: Partial<Client> = {}
    if (showPersonal) {
      const previousSpouseId = client.spouseId
      const newSpouseId = form.spouseId || undefined
      Object.assign(updates, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dob: dobStr,
        turning65Date: getT65FromDob(dobStr),
        language: form.language.trim() || "English",
        spouseId: newSpouseId,
        title: form.title.trim() || undefined,
        middleName: form.middleName.trim() || undefined,
        suffix: form.suffix.trim() || undefined,
        nickname: form.nickname.trim() || undefined,
        gender: (form.gender === "M" || form.gender === "F" ? form.gender : undefined) as "M" | "F" | undefined,
        funFacts: form.funFacts.trim() || undefined,
        source: form.source.trim() || undefined,
      })
      if (previousSpouseId !== newSpouseId) {
        if (previousSpouseId) {
          updateClient(previousSpouseId, { spouseId: undefined })
        }
        if (newSpouseId) {
          updateClient(newSpouseId, { spouseId: client.id })
        }
      }
    }
    if (showContact) {
      Object.assign(updates, {
        preferredContactMethod: form.preferredContactMethod,
      })
      if (section === "quick") {
        const phones = client.phones ?? []
        const emails = client.emails ?? []
        if (phones.length > 0) {
          const preferredIdx = phones.findIndex((p) => p.isPreferred)
          const idx = preferredIdx >= 0 ? preferredIdx : 0
          const updatedPhones = phones.map((p, i) =>
            i === idx ? { ...p, number: formatPhoneNumber(form.preferredPhoneNumber.trim()) } : p
          )
          Object.assign(updates, { phones: updatedPhones })
        }
        if (emails.length > 0) {
          const preferredIdx = emails.findIndex((e) => e.isPreferred)
          const idx = preferredIdx >= 0 ? preferredIdx : 0
          const updatedEmails = emails.map((e, i) =>
            i === idx ? { ...e, value: form.preferredEmailValue.trim() } : e
          )
          Object.assign(updates, { emails: updatedEmails })
        }
      }
    }
    if (showAddresses) {
      if (section === "quick") {
        if (form.addresses.length === 1 && client.addresses?.length) {
          const updated = form.addresses[0]
          const preferredId = getPreferredOrFirstAddress(client)?.id
          const finalAddresses = (client.addresses ?? []).map((a) =>
            a.id === preferredId ? { ...updated, id: a.id, isPreferred: true } : a
          )
          Object.assign(updates, { addresses: finalAddresses })
          if (alsoUpdateSpouseAddresses && client.spouseId) {
            const spouse = clients.find((c) => c.id === client.spouseId)
            if (spouse) {
              const spouseAddresses = finalAddresses.map((a) => ({
                ...a,
                id: crypto.randomUUID(),
              }))
              updateClient(spouse.id, { addresses: spouseAddresses })
              const sourceName = [client.title, client.firstName, client.lastName, client.suffix].filter(Boolean).join(" ")
              addActivity({
                id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                relatedType: "Client",
                relatedId: spouse.id,
                type: "note",
                description: `Addresses updated from ${sourceName}'s profile`,
                createdAt: new Date().toISOString(),
                createdBy: currentAgent,
              })
            }
          }
        }
      } else {
        const addresses = form.addresses
          .filter((a) => (a.address || a.city || a.zip || a.state)?.trim())
          .map((a, i) => ({
            ...a,
            isPreferred:
              form.addresses.length === 1
                ? true
                : a.isPreferred ?? (i === 0 && !form.addresses.some((x) => x.isPreferred)),
          }))
        if (addresses.length && !addresses.some((a) => a.isPreferred))
          addresses[0] = { ...addresses[0], isPreferred: true }
        const finalAddresses = addresses.length ? addresses : form.addresses
        Object.assign(updates, {
          addresses: finalAddresses,
        })
        if (alsoUpdateSpouseAddresses && client.spouseId) {
          const spouse = clients.find((c) => c.id === client.spouseId)
          if (spouse) {
            const spouseAddresses = finalAddresses.map((a) => ({
              ...a,
              id: crypto.randomUUID(),
            }))
            updateClient(spouse.id, { addresses: spouseAddresses })
            const sourceName = [client.title, client.firstName, client.lastName, client.suffix].filter(Boolean).join(" ")
            addActivity({
              id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              relatedType: "Client",
              relatedId: spouse.id,
              type: "note",
              description: `Addresses updated from ${sourceName}'s profile`,
              createdAt: new Date().toISOString(),
              createdBy: currentAgent,
            })
          }
        }
      }
    }
    if (showMedicare) {
      const mbiTrimmed = form.medicareNumber.trim()
      Object.assign(updates, {
        medicareNumber: mbiTrimmed,
        hasMedicareNumber: mbiTrimmed !== "",
        partAEffectiveDate: monthValueToEffectiveDate(form.partAEffectiveDate),
        partBEffectiveDate: monthValueToEffectiveDate(form.partBEffectiveDate),
      })
    }

    updateClient(client.id, updates)

    const desc =
      section === "personal"
        ? "Personal details updated"
        : section === "contact"
          ? "Contact information updated"
          : section === "addresses"
            ? "Addresses updated"
            : section === "medicare"
              ? "Medicare information updated"
              : section === "quick"
                ? "Profile information updated"
                : "Profile information updated"
    addActivity({
      id: `act-${Date.now()}`,
      relatedType: "Client",
      relatedId: client.id,
      type: "note",
      description: desc,
      createdAt: new Date().toISOString(),
      createdBy: currentAgent,
    })

    toast.success(
      section === "personal"
        ? "Personal details updated"
        : section === "contact"
          ? "Contact information updated"
          : section === "addresses"
            ? "Addresses updated"
            : section === "medicare"
              ? "Medicare information updated"
              : "Profile updated",
      {
        description:
          section === "personal" || section === null || section === "quick"
            ? `${form.firstName} ${form.lastName}'s details have been saved`
            : undefined,
      }
    )
    onOpenChange(false)
  }

  const title =
    section === "personal"
      ? "Edit personal details"
      : section === "contact"
        ? "Edit contact information"
        : section === "addresses"
          ? "Edit addresses"
          : section === "medicare"
            ? "Edit Medicare information"
            : section === "quick"
              ? "Quick Edit"
              : "Edit client"
  const description =
    section === "personal"
      ? "Update name, date of birth, language, source, spouse, gender, title, nickname, and fun facts."
      : section === "contact"
        ? "Update phone, email, and preferred contact method."
        : section === "addresses"
          ? "Add or edit addresses and set a preferred address."
          : section === "medicare"
            ? "Update Medicare number and Part A/B effective dates."
            : section === "quick"
              ? "Update personal details, contact information, and addresses."
              : "Update personal, contact, and Medicare information for this client."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-lg"
        aria-describedby="edit-client-description"
        onPointerDownOutside={(e) => {
          if ((e.target as Element).closest?.("[data-address-autocomplete-listbox]")) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="edit-client-description">
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden py-2 px-2">
          <div className="grid min-w-0 gap-4">
            {showPersonal && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title">Title</Label>
                  <Select
                    value={form.title || "__none__"}
                    onValueChange={(v) => setForm({ ...form, title: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger id="edit-title">
                      <SelectValue placeholder="Select title" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="Mr.">Mr.</SelectItem>
                      <SelectItem value="Mrs.">Mrs.</SelectItem>
                      <SelectItem value="Miss">Miss</SelectItem>
                      <SelectItem value="Ms.">Ms.</SelectItem>
                      <SelectItem value="Dr.">Dr.</SelectItem>
                      <SelectItem value="Rev.">Rev.</SelectItem>
                      <SelectItem value="Prof.">Prof.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-firstName">First name</Label>
                    <Input
                      id="edit-firstName"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Mary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-lastName">Last name</Label>
                    <Input
                      id="edit-lastName"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Adams"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-middleName">Middle name</Label>
                    <Input
                      id="edit-middleName"
                      value={form.middleName}
                      onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-suffix">Suffix</Label>
                    <Select
                      value={form.suffix || "__none__"}
                      onValueChange={(v) => setForm({ ...form, suffix: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger id="edit-suffix">
                        <SelectValue placeholder="Select suffix" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="Jr.">Jr.</SelectItem>
                        <SelectItem value="Sr.">Sr.</SelectItem>
                        <SelectItem value="II">II</SelectItem>
                        <SelectItem value="III">III</SelectItem>
                        <SelectItem value="IV">IV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-nickname">Nickname</Label>
                  <Input
                    id="edit-nickname"
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                    placeholder="Goes by..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-gender">Gender</Label>
                  <Select
                    value={form.gender || "__none__"}
                    onValueChange={(v) =>
                      setForm({ ...form, gender: v === "__none__" ? "" : (v as "M" | "F") })
                    }
                  >
                    <SelectTrigger id="edit-gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-dob">Date of birth</Label>
                  <DatePicker
                    id="edit-dob"
                    value={form.dob}
                    onChange={(v) => setForm({ ...form, dob: v })}
                    placeholder="Pick a date"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-language">Language</Label>
                  <Select
                    value={form.language || "English"}
                    onValueChange={(v) => setForm({ ...form, language: v })}
                  >
                    <SelectTrigger id="edit-language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                      {form.language &&
                        !LANGUAGE_OPTIONS.includes(form.language) && (
                          <SelectItem value={form.language}>
                            {form.language}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-source">Source</Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.source || "__none__"}
                      onValueChange={(v) =>
                        setForm({ ...form, source: v === "__none__" ? "" : v })
                      }
                    >
                      <SelectTrigger id="edit-source" className="flex-1">
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
                  <Label htmlFor="edit-spouse">Spouse</Label>
                  <Select
                    value={form.spouseId ?? "__none__"}
                    onValueChange={(v) => setForm({ ...form, spouseId: v === "__none__" ? null : v })}
                  >
                    <SelectTrigger id="edit-spouse">
                      <SelectValue placeholder="Select spouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None</SelectItem>
                      {eligibleClients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {[c.title, c.firstName, c.lastName, c.suffix].filter(Boolean).join(" ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-funFacts">Fun facts</Label>
                  <Textarea
                    id="edit-funFacts"
                    value={form.funFacts}
                    onChange={(e) => setForm({ ...form, funFacts: e.target.value })}
                    placeholder="Anything memorable to remember about this client"
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </>
            )}

            {showContact && (
              <div className="space-y-4">
                {section === "quick" ? (
                  <>
                    {client.phones?.length ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-quick-phone">Phone</Label>
                        <Input
                          id="edit-quick-phone"
                          value={form.preferredPhoneNumber}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                            setForm({ ...form, preferredPhoneNumber: formatPhoneNumber(digits) })
                          }}
                          placeholder="(555) 555-5555"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No phone on file. Add one from the Contact section on the client profile.</p>
                    )}
                    {client.emails?.length ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-quick-email">Email</Label>
                        <Input
                          id="edit-quick-email"
                          type="email"
                          value={form.preferredEmailValue}
                          onChange={(e) => setForm({ ...form, preferredEmailValue: e.target.value })}
                          placeholder="mary@example.com"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No email on file. Add one from the Contact section on the client profile.</p>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-preferredContact">Preferred contact method</Label>
                      <Select
                        value={form.preferredContactMethod}
                        onValueChange={(v) =>
                          setForm({ ...form, preferredContactMethod: v as "phone" | "email" | "text" })
                        }
                      >
                        <SelectTrigger id="edit-preferredContact">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Add or edit phone numbers and email addresses in the Contact card on the client profile.
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-preferredContact">Preferred contact method</Label>
                      <Select
                        value={form.preferredContactMethod}
                        onValueChange={(v) =>
                          setForm({ ...form, preferredContactMethod: v as "phone" | "email" | "text" })
                        }
                      >
                        <SelectTrigger id="edit-preferredContact">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            )}

            {showAddresses && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Addresses</p>
                  {section === "quick" ? (
                    <>
                      {form.addresses.length === 1 ? (
                        <AddressForm
                          address={form.addresses[0]}
                          onChange={(patch) =>
                            setForm((prev) => ({
                              ...prev,
                              addresses: [{ ...prev.addresses[0], ...patch }],
                            }))
                          }
                          showType={true}
                          showPreferred={false}
                          allowManualEntry={true}
                          dialogOpen={open}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">No address on file. Add one from the Addresses section on the client profile.</p>
                      )}
                      {client.spouseId && form.addresses.length === 1 && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="edit-addresses-also-spouse-quick"
                            checked={alsoUpdateSpouseAddresses}
                            onCheckedChange={(v) => setAlsoUpdateSpouseAddresses(v === true)}
                          />
                          <label htmlFor="edit-addresses-also-spouse-quick" className="text-sm cursor-pointer">Also update spouse&apos;s addresses</label>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                  {client.spouseId && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="edit-addresses-also-spouse"
                        checked={alsoUpdateSpouseAddresses}
                        onCheckedChange={(v) => setAlsoUpdateSpouseAddresses(v === true)}
                      />
                      <label htmlFor="edit-addresses-also-spouse" className="text-sm cursor-pointer">Also update spouse&apos;s addresses</label>
                    </div>
                  )}
                  {form.addresses.length === 0 ? (
                    <AddressForm
                      address={createEmptyAddress()}
                      onChange={(patch) => {
                        const newAddr = { ...createEmptyAddress(), ...patch, isPreferred: true }
                        setForm((prev) => ({ ...prev, addresses: [newAddr] }))
                        setEditingAddressIndex(null)
                      }}
                      showType={true}
                      showPreferred={false}
                      allowManualEntry={true}
                      dialogOpen={open}
                    />
                  ) : (
                    <>
                      {form.addresses.map((addr, index) => (
                        <div key={addr.id}>
                          {editingAddressIndex === index ? (
                            <AddressForm
                              address={addr}
                              onChange={(patch) => {
                                const next = form.addresses.map((a, i) =>
                                  i === index ? { ...a, ...patch } : a
                                )
                                if (patch.isPreferred) {
                                  const normalized = next.map((a, i) => ({
                                    ...a,
                                    isPreferred: i === index,
                                  }))
                                  setForm((prev) => ({ ...prev, addresses: normalized }))
                                } else {
                                  setForm((prev) => ({ ...prev, addresses: next }))
                                }
                              }}
                              onRemove={
                                form.addresses.length > 1
                                  ? () => {
                                      const next = form.addresses.filter((_, i) => i !== index)
                                      if (addr.isPreferred && next.length)
                                        next[0] = { ...next[0], isPreferred: true }
                                      setForm((prev) => ({ ...prev, addresses: next }))
                                      setEditingAddressIndex(null)
                                    }
                                  : undefined
                              }
                              showType={true}
                              showPreferred={form.addresses.length > 1}
                              allowManualEntry={true}
                              dialogOpen={open}
                            />
                          ) : (
                            <AddressCard
                              address={addr}
                              onEdit={() => setEditingAddressIndex(index)}
                              onRemove={
                                form.addresses.length > 1
                                  ? () => {
                                      const next = form.addresses.filter((_, i) => i !== index)
                                      if (addr.isPreferred && next.length)
                                        next[0] = { ...next[0], isPreferred: true }
                                      setForm((prev) => ({ ...prev, addresses: next }))
                                    }
                                  : undefined
                              }
                              hidePreferredWhenOnlyOne={form.addresses.length === 1}
                            />
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newAddr = createEmptyAddress()
                          setForm((prev) => ({ ...prev, addresses: [...prev.addresses, newAddr] }))
                          setEditingAddressIndex(form.addresses.length)
                        }}
                      >
                        Add address
                      </Button>
                    </>
                  )}
                    </>
                  )}
                </div>
            )}

            {showMedicare && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-medicare">Medicare number</Label>
                  <Input
                    id="edit-medicare"
                    value={form.medicareNumber}
                    onChange={(e) => setForm({ ...form, medicareNumber: e.target.value })}
                    placeholder={loadingMedicareNumber ? "Loading…" : "1EG4-TE5-MK72"}
                    disabled={loadingMedicareNumber}
                    aria-busy={loadingMedicareNumber}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-partA">Part A effective date</Label>
                    <DatePicker
                      id="edit-partA"
                      value={form.partAEffectiveDate}
                      onChange={(v) => setForm({ ...form, partAEffectiveDate: v })}
                      placeholder="Pick a month"
                      monthOnly
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-partB">Part B effective date</Label>
                    <DatePicker
                      id="edit-partB"
                      value={form.partBEffectiveDate}
                      onChange={(v) => setForm({ ...form, partBEffectiveDate: v })}
                      placeholder="Pick a month"
                      monthOnly
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 gap-2 pt-2">
            <Button type="button" variant="outline" className="min-h-[40px] w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-[40px] w-full sm:w-auto">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
