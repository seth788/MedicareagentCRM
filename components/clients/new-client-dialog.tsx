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
import { useCRMStore } from "@/lib/store"
import { getT65FromDob } from "@/lib/date-utils"
import { goeyToast } from "goey-toast"

interface NewClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewClientDialog({ open, onOpenChange }: NewClientDialogProps) {
  const { addClient } = useCRMStore()
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dob: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    preferredContactMethod: "phone" as "phone" | "email" | "text",
    language: "English",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName) {
      goeyToast.error("First and last name are required")
      return
    }

    const dobStr = form.dob || "1961-01-01"

    addClient({
      id: `client-${Date.now()}`,
      ...form,
      dob: dobStr,
      turning65Date: getT65FromDob(dobStr),
      medicareNumber: "",
      partAEffectiveDate: "",
      partBEffectiveDate: "",
      doctors: [],
      medications: [],
      pharmacy: { name: "", phone: "", address: "" },
      allergies: [],
      conditions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    goeyToast.success("Client created", {
      description: `${form.firstName} ${form.lastName} has been added`,
    })
    setForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dob: "",
      address: "",
      city: "",
      state: "",
      zip: "",
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="mary@email.com"
              />
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
            <Label htmlFor="c-address">Address</Label>
            <Input
              id="c-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-city">City</Label>
              <Input
                id="c-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-state">State</Label>
              <Input
                id="c-state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                maxLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-zip">ZIP</Label>
              <Input
                id="c-zip"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
              />
            </div>
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
