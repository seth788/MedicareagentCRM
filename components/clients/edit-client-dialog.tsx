"use client"

import { useState, useEffect } from "react"
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
import { useCRMStore } from "@/lib/store"
import { getT65FromDob } from "@/lib/date-utils"
import { goeyToast } from "goey-toast"
import type { Client } from "@/lib/types"

export type EditClientSection = "personal" | "contact" | "medicare"

interface EditClientDialogProps {
  client: Client
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, only this section is shown and updated. When undefined, show all (header Edit). */
  section?: EditClientSection | null
}

const CREATED_BY = "Sarah Mitchell"

export function EditClientDialog({
  client,
  open,
  onOpenChange,
  section: sectionProp = null,
}: EditClientDialogProps) {
  const { updateClient, addActivity } = useCRMStore()
  const section = sectionProp ?? null
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    dob: "",
    language: "English",
    preferredContactMethod: "phone" as "phone" | "email" | "text",
    householdMembersStr: "",
    medicareNumber: "",
    partAEffectiveDate: "",
    partBEffectiveDate: "",
  })

  useEffect(() => {
    if (open && client) {
      setForm({
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        email: client.email,
        address: client.address,
        city: client.city,
        state: client.state,
        zip: client.zip,
        dob: client.dob?.includes("T") ? client.dob.slice(0, 10) : client.dob || "",
        language: client.language || "English",
        preferredContactMethod: client.preferredContactMethod,
        householdMembersStr: client.householdMembers?.join(", ") || "",
        medicareNumber: client.medicareNumber || "",
        partAEffectiveDate: client.partAEffectiveDate?.includes("T")
          ? client.partAEffectiveDate.slice(0, 10)
          : client.partAEffectiveDate || "",
        partBEffectiveDate: client.partBEffectiveDate?.includes("T")
          ? client.partBEffectiveDate.slice(0, 10)
          : client.partBEffectiveDate || "",
      })
    }
  }, [open, client])

  const showPersonal = section === null || section === "personal"
  const showContact = section === null || section === "contact"
  const showMedicare = section === null || section === "medicare"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (showPersonal && (!form.firstName.trim() || !form.lastName.trim())) {
      goeyToast.error("First and last name are required")
      return
    }

    const dobStr = form.dob || client.dob || ""
    const householdMembers = form.householdMembersStr
      ? form.householdMembersStr.split(",").map((s) => s.trim()).filter(Boolean)
      : []

    const updates: Partial<Client> = {}
    if (showPersonal) {
      Object.assign(updates, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dob: dobStr,
        turning65Date: getT65FromDob(dobStr),
        language: form.language.trim() || "English",
        householdMembers: householdMembers.length ? householdMembers : undefined,
      })
    }
    if (showContact) {
      Object.assign(updates, {
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        preferredContactMethod: form.preferredContactMethod,
      })
    }
    if (showMedicare) {
      Object.assign(updates, {
        medicareNumber: form.medicareNumber.trim(),
        partAEffectiveDate: form.partAEffectiveDate || "",
        partBEffectiveDate: form.partBEffectiveDate || "",
      })
    }

    updateClient(client.id, updates)

    const desc =
      section === "personal"
        ? "Personal details updated"
        : section === "contact"
          ? "Contact information updated"
          : section === "medicare"
            ? "Medicare information updated"
            : "Profile information updated"
    addActivity({
      id: `act-${Date.now()}`,
      relatedType: "Client",
      relatedId: client.id,
      type: "note",
      description: desc,
      createdAt: new Date().toISOString(),
      createdBy: CREATED_BY,
    })

    goeyToast.success(
      section === "personal"
        ? "Personal details updated"
        : section === "contact"
          ? "Contact information updated"
          : section === "medicare"
            ? "Medicare information updated"
            : "Profile updated",
      {
        description:
          section === "personal" || section === null
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
        : section === "medicare"
          ? "Edit Medicare information"
          : "Edit client"
  const description =
    section === "personal"
      ? "Update name, date of birth, language, and household members."
      : section === "contact"
        ? "Update phone, email, address, and preferred contact method."
        : section === "medicare"
          ? "Update Medicare number and Part A/B effective dates."
          : "Update personal, contact, and Medicare information for this client."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        aria-describedby="edit-client-description"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="edit-client-description">
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-4">
            {showPersonal && (
              <>
                <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <Label htmlFor="edit-dob">Date of birth</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-language">Language</Label>
                  <Input
                    id="edit-language"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    placeholder="English"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-household">Household members</Label>
                  <Input
                    id="edit-household"
                    value={form.householdMembersStr}
                    onChange={(e) => setForm({ ...form, householdMembersStr: e.target.value })}
                    placeholder="Comma-separated names"
                  />
                </div>
              </>
            )}

            {showContact && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="mary@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-preferredContact">Preferred contact</Label>
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
                <div className="space-y-1.5">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-city">City</Label>
                    <Input
                      id="edit-city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-state">State</Label>
                    <Input
                      id="edit-state"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      maxLength={2}
                      placeholder="CA"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-zip">ZIP</Label>
                    <Input
                      id="edit-zip"
                      value={form.zip}
                      onChange={(e) => setForm({ ...form, zip: e.target.value })}
                      placeholder="90210"
                    />
                  </div>
                </div>
              </>
            )}

            {showMedicare && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-medicare">Medicare number</Label>
                  <Input
                    id="edit-medicare"
                    value={form.medicareNumber}
                    onChange={(e) => setForm({ ...form, medicareNumber: e.target.value })}
                    placeholder="1EG4-TE5-MK72"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-partA">Part A effective date</Label>
                    <Input
                      id="edit-partA"
                      type="date"
                      value={form.partAEffectiveDate}
                      onChange={(e) => setForm({ ...form, partAEffectiveDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-partB">Part B effective date</Label>
                    <Input
                      id="edit-partB"
                      type="date"
                      value={form.partBEffectiveDate}
                      onChange={(e) => setForm({ ...form, partBEffectiveDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
