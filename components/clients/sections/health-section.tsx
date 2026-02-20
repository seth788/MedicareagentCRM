"use client"

import { useState, useEffect } from "react"
import { Stethoscope, Pill, Building2, AlertTriangle, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"
import type { Doctor, Medication } from "@/lib/types"
import type { SectionProps } from "./types"

export function HealthSection({ client }: SectionProps) {
  const { updateClient, addActivity } = useCRMStore()

  const [addDoctorOpen, setAddDoctorOpen] = useState(false)
  const [newDoctor, setNewDoctor] = useState<Doctor>({ name: "", specialty: "", phone: "" })

  const [addMedOpen, setAddMedOpen] = useState(false)
  const [newMed, setNewMed] = useState<Medication>({ name: "", dosage: "", frequency: "" })

  const [editPharmOpen, setEditPharmOpen] = useState(false)
  const [pharmForm, setPharmForm] = useState({
    name: client.pharmacy.name,
    phone: client.pharmacy.phone,
    address: client.pharmacy.address,
  })

  const [addAllergyOpen, setAddAllergyOpen] = useState(false)
  const [newAllergy, setNewAllergy] = useState("")
  const [addConditionOpen, setAddConditionOpen] = useState(false)
  const [newCondition, setNewCondition] = useState("")

  useEffect(() => {
    if (editPharmOpen) {
      setPharmForm({
        name: client.pharmacy.name,
        phone: client.pharmacy.phone,
        address: client.pharmacy.address,
      })
    }
  }, [editPharmOpen, client.pharmacy])

  const logActivity = (description: string) => {
    addActivity({
      id: `act-${Date.now()}`,
      relatedType: "Client",
      relatedId: client.id,
      type: "note",
      description,
      createdAt: new Date().toISOString(),
      createdBy: "Sarah Mitchell",
    })
  }

  const handleAddDoctor = () => {
    if (!newDoctor.name.trim()) return
    updateClient(client.id, { doctors: [...client.doctors, newDoctor] })
    logActivity(`Doctor added: ${newDoctor.name}`)
    setNewDoctor({ name: "", specialty: "", phone: "" })
    setAddDoctorOpen(false)
    goeyToast.success("Doctor added")
  }

  const handleRemoveDoctor = (index: number) => {
    const removed = client.doctors[index]
    const updated = client.doctors.filter((_, i) => i !== index)
    updateClient(client.id, { doctors: updated })
    logActivity(`Doctor removed: ${removed?.name ?? "Unknown"}`)
    goeyToast.success("Doctor removed")
  }

  const handleAddMed = () => {
    if (!newMed.name.trim()) return
    updateClient(client.id, { medications: [...client.medications, newMed] })
    logActivity(`Medication added: ${newMed.name}`)
    setNewMed({ name: "", dosage: "", frequency: "" })
    setAddMedOpen(false)
    goeyToast.success("Medication added")
  }

  const handleRemoveMed = (index: number) => {
    const removed = client.medications[index]
    const updated = client.medications.filter((_, i) => i !== index)
    updateClient(client.id, { medications: updated })
    logActivity(`Medication removed: ${removed?.name ?? "Unknown"}`)
    goeyToast.success("Medication removed")
  }

  const handleUpdatePharmacy = () => {
    updateClient(client.id, { pharmacy: { ...pharmForm } })
    logActivity(
      client.pharmacy.name
        ? `Pharmacy updated: ${pharmForm.name}`
        : `Pharmacy added: ${pharmForm.name}`
    )
    setEditPharmOpen(false)
    goeyToast.success("Pharmacy updated")
  }

  const handleAddAllergy = () => {
    if (!newAllergy.trim()) return
    updateClient(client.id, { allergies: [...client.allergies, newAllergy.trim()] })
    logActivity(`Allergy added: ${newAllergy.trim()}`)
    setNewAllergy("")
    setAddAllergyOpen(false)
    goeyToast.success("Allergy added")
  }

  const handleRemoveAllergy = (allergy: string) => {
    updateClient(client.id, { allergies: client.allergies.filter((a) => a !== allergy) })
    logActivity(`Allergy removed: ${allergy}`)
    goeyToast.success("Allergy removed")
  }

  const handleAddCondition = () => {
    if (!newCondition.trim()) return
    updateClient(client.id, { conditions: [...client.conditions, newCondition.trim()] })
    logActivity(`Condition added: ${newCondition.trim()}`)
    setNewCondition("")
    setAddConditionOpen(false)
    goeyToast.success("Condition added")
  }

  const handleRemoveCondition = (condition: string) => {
    updateClient(client.id, { conditions: client.conditions.filter((c) => c !== condition) })
    logActivity(`Condition removed: ${condition}`)
    goeyToast.success("Condition removed")
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Doctors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Stethoscope className="h-5 w-5 text-primary" />
            Doctors
          </CardTitle>
          <Dialog open={addDoctorOpen} onOpenChange={setAddDoctorOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Doctor</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div>
                  <Label htmlFor="doc-name">Doctor Name</Label>
                  <Input
                    id="doc-name"
                    placeholder="Dr. Jane Smith"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="doc-specialty">Specialty</Label>
                  <Input
                    id="doc-specialty"
                    placeholder="Primary Care"
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="doc-phone">Phone</Label>
                  <Input
                    id="doc-phone"
                    placeholder="(555) 123-4567"
                    value={newDoctor.phone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDoctorOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDoctor} disabled={!newDoctor.name.trim()}>
                  Add Doctor
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {client.doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Stethoscope className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No doctors on file</p>
              <p className="text-xs text-muted-foreground">
                Add a doctor to keep their information handy.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {client.doctors.map((doc, i) => (
                <div
                  key={i}
                  className="group flex items-center justify-between py-3 first:pt-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.specialty} · {doc.phone}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleRemoveDoctor(i)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Remove doctor</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Pill className="h-5 w-5 text-primary" />
            Medications
          </CardTitle>
          <Dialog open={addMedOpen} onOpenChange={setAddMedOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Medication</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div>
                  <Label htmlFor="med-name">Medication Name</Label>
                  <Input
                    id="med-name"
                    placeholder="Lisinopril"
                    value={newMed.name}
                    onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="med-dosage">Dosage</Label>
                  <Input
                    id="med-dosage"
                    placeholder="10mg"
                    value={newMed.dosage}
                    onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="med-freq">Frequency</Label>
                  <Input
                    id="med-freq"
                    placeholder="Daily"
                    value={newMed.frequency}
                    onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMedOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMed} disabled={!newMed.name.trim()}>
                  Add Medication
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {client.medications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Pill className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No medications on file</p>
              <p className="text-xs text-muted-foreground">
                Add medications to track what this client takes.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {client.medications.map((med, i) => (
                <div
                  key={i}
                  className="group flex items-center justify-between py-3 first:pt-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{med.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {med.dosage} · {med.frequency}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleRemoveMed(i)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Remove medication</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pharmacy */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            Pharmacy
          </CardTitle>
          <Dialog open={editPharmOpen} onOpenChange={setEditPharmOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {client.pharmacy.name ? "Edit" : (
                  <>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{client.pharmacy.name ? "Edit" : "Add"} Pharmacy</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div>
                  <Label htmlFor="pharm-name">Pharmacy Name</Label>
                  <Input
                    id="pharm-name"
                    placeholder="CVS Pharmacy"
                    value={pharmForm.name}
                    onChange={(e) => setPharmForm({ ...pharmForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pharm-phone">Phone</Label>
                  <Input
                    id="pharm-phone"
                    placeholder="(555) 123-4567"
                    value={pharmForm.phone}
                    onChange={(e) => setPharmForm({ ...pharmForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pharm-address">Address</Label>
                  <Input
                    id="pharm-address"
                    placeholder="123 Main St, City, State 12345"
                    value={pharmForm.address}
                    onChange={(e) => setPharmForm({ ...pharmForm, address: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditPharmOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdatePharmacy} disabled={!pharmForm.name.trim()}>
                  Save Pharmacy
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {client.pharmacy.name ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">{client.pharmacy.name}</p>
              <p className="text-muted-foreground">{client.pharmacy.phone}</p>
              <p className="text-muted-foreground">{client.pharmacy.address}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No pharmacy on file</p>
              <p className="text-xs text-muted-foreground">
                Add pharmacy details for prescriptions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allergies & Conditions */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Allergies & Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-0">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Allergies</p>
              <Dialog open={addAllergyOpen} onOpenChange={setAddAllergyOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Add Allergy</DialogTitle>
                  </DialogHeader>
                  <div className="py-2">
                    <Label htmlFor="allergy-name">Allergy</Label>
                    <Input
                      id="allergy-name"
                      placeholder="Penicillin"
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddAllergyOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddAllergy} disabled={!newAllergy.trim()}>
                      Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {client.allergies.length === 0 ? (
                <span className="text-sm text-muted-foreground">None reported</span>
              ) : (
                client.allergies.map((a) => (
                  <Badge
                    key={a}
                    variant="outline"
                    className="group cursor-default border-destructive/20 bg-destructive/10 text-destructive text-xs"
                  >
                    {a}
                    <button
                      onClick={() => handleRemoveAllergy(a)}
                      className="ml-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-destructive/20 group-hover:inline-flex"
                      aria-label={`Remove ${a}`}
                    >
                      <span className="text-[10px]">×</span>
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>
          <Separator />
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Conditions</p>
              <Dialog open={addConditionOpen} onOpenChange={setAddConditionOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Add Condition</DialogTitle>
                  </DialogHeader>
                  <div className="py-2">
                    <Label htmlFor="condition-name">Condition</Label>
                    <Input
                      id="condition-name"
                      placeholder="Type 2 Diabetes"
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddConditionOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddCondition} disabled={!newCondition.trim()}>
                      Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {client.conditions.length === 0 ? (
                <span className="text-sm text-muted-foreground">None reported</span>
              ) : (
                client.conditions.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="group cursor-default text-xs"
                  >
                    {c}
                    <button
                      onClick={() => handleRemoveCondition(c)}
                      className="ml-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-muted group-hover:inline-flex"
                      aria-label={`Remove ${c}`}
                    >
                      <span className="text-[10px]">×</span>
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
