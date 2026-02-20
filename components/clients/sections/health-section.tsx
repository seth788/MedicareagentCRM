"use client"

import { useState } from "react"
import { Stethoscope, Pill, Building2, AlertTriangle, Plus, Trash2, Pencil, MoreVertical } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"
import type { Doctor, Medication, Pharmacy } from "@/lib/types"
import type { SectionProps } from "./types"

export function HealthSection({ client }: SectionProps) {
  const { updateClient, addActivity } = useCRMStore()

  const [addDoctorOpen, setAddDoctorOpen] = useState(false)
  const [editDoctorIndex, setEditDoctorIndex] = useState<number | null>(null)
  const [doctorForm, setDoctorForm] = useState<Doctor>({ name: "", specialty: "", phone: "" })

  const [addMedOpen, setAddMedOpen] = useState(false)
  const [editMedIndex, setEditMedIndex] = useState<number | null>(null)
  const [medForm, setMedForm] = useState<Medication>({ name: "", dosage: "", frequency: "" })

  const [pharmDialogOpen, setPharmDialogOpen] = useState(false)
  const [editPharmIndex, setEditPharmIndex] = useState<number | null>(null)
  const [pharmForm, setPharmForm] = useState<Pharmacy>({ name: "", phone: "", address: "" })

  const [addAllergyOpen, setAddAllergyOpen] = useState(false)
  const [newAllergy, setNewAllergy] = useState("")
  const [editAllergyOpen, setEditAllergyOpen] = useState(false)
  const [editingAllergy, setEditingAllergy] = useState({ value: "", original: "" })

  const [addConditionOpen, setAddConditionOpen] = useState(false)
  const [newCondition, setNewCondition] = useState("")
  const [editConditionOpen, setEditConditionOpen] = useState(false)
  const [editingCondition, setEditingCondition] = useState({ value: "", original: "" })

  const openPharmForm = (pharmacy?: Pharmacy, index?: number) => {
    setPharmForm(pharmacy ?? { name: "", phone: "", address: "" })
    setEditPharmIndex(index ?? null)
    setPharmDialogOpen(true)
  }

  const openDoctorForm = (doctor?: Doctor, index?: number) => {
    setDoctorForm(doctor ?? { name: "", specialty: "", phone: "" })
    setEditDoctorIndex(index ?? null)
    setAddDoctorOpen(true)
  }

  const openMedForm = (med?: Medication, index?: number) => {
    setMedForm(med ?? { name: "", dosage: "", frequency: "" })
    setEditMedIndex(index ?? null)
    setAddMedOpen(true)
  }

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

  const handleSaveDoctor = () => {
    if (!doctorForm.name.trim()) return
    if (editDoctorIndex !== null) {
      const updated = [...client.doctors]
      updated[editDoctorIndex] = doctorForm
      updateClient(client.id, { doctors: updated })
      logActivity(`Doctor updated: ${doctorForm.name}`)
      goeyToast.success("Doctor updated")
    } else {
      updateClient(client.id, { doctors: [...client.doctors, doctorForm] })
      logActivity(`Doctor added: ${doctorForm.name}`)
      goeyToast.success("Doctor added")
    }
    setDoctorForm({ name: "", specialty: "", phone: "" })
    setEditDoctorIndex(null)
    setAddDoctorOpen(false)
  }

  const handleRemoveDoctor = (index: number) => {
    const removed = client.doctors[index]
    const updated = client.doctors.filter((_, i) => i !== index)
    updateClient(client.id, { doctors: updated })
    logActivity(`Doctor removed: ${removed?.name ?? "Unknown"}`)
    goeyToast.success("Doctor removed")
  }

  const handleSaveMed = () => {
    if (!medForm.name.trim()) return
    if (editMedIndex !== null) {
      const updated = [...client.medications]
      updated[editMedIndex] = medForm
      updateClient(client.id, { medications: updated })
      logActivity(`Medication updated: ${medForm.name}`)
      goeyToast.success("Medication updated")
    } else {
      updateClient(client.id, { medications: [...client.medications, medForm] })
      logActivity(`Medication added: ${medForm.name}`)
      goeyToast.success("Medication added")
    }
    setMedForm({ name: "", dosage: "", frequency: "" })
    setEditMedIndex(null)
    setAddMedOpen(false)
  }

  const handleRemoveMed = (index: number) => {
    const removed = client.medications[index]
    const updated = client.medications.filter((_, i) => i !== index)
    updateClient(client.id, { medications: updated })
    logActivity(`Medication removed: ${removed?.name ?? "Unknown"}`)
    goeyToast.success("Medication removed")
  }

  const handleSavePharmacy = () => {
    if (!pharmForm.name.trim()) return
    const pharmacies = client.pharmacies ?? []
    if (editPharmIndex !== null) {
      const updated = [...pharmacies]
      updated[editPharmIndex] = { ...pharmForm }
      updateClient(client.id, { pharmacies: updated })
      logActivity(`Pharmacy updated: ${pharmForm.name}`)
      goeyToast.success("Pharmacy updated")
    } else {
      updateClient(client.id, { pharmacies: [...pharmacies, { ...pharmForm }] })
      logActivity(`Pharmacy added: ${pharmForm.name}`)
      goeyToast.success("Pharmacy added")
    }
    setPharmForm({ name: "", phone: "", address: "" })
    setEditPharmIndex(null)
    setPharmDialogOpen(false)
  }

  const handleRemovePharmacy = (index: number) => {
    const pharmacies = (client.pharmacies ?? []).filter((_, i) => i !== index)
    const removed = client.pharmacies?.[index]
    updateClient(client.id, { pharmacies })
    logActivity(`Pharmacy removed: ${removed?.name ?? "Unknown"}`)
    goeyToast.success("Pharmacy removed")
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

  const handleEditAllergy = () => {
    if (!editingAllergy.value.trim() || editingAllergy.value === editingAllergy.original) {
      setEditAllergyOpen(false)
      return
    }
    const updated = client.allergies.map((a) =>
      a === editingAllergy.original ? editingAllergy.value.trim() : a
    )
    updateClient(client.id, { allergies: updated })
    logActivity(`Allergy updated: ${editingAllergy.original} → ${editingAllergy.value.trim()}`)
    goeyToast.success("Allergy updated")
    setEditAllergyOpen(false)
  }

  const handleEditCondition = () => {
    if (!editingCondition.value.trim() || editingCondition.value === editingCondition.original) {
      setEditConditionOpen(false)
      return
    }
    const updated = client.conditions.map((c) =>
      c === editingCondition.original ? editingCondition.value.trim() : c
    )
    updateClient(client.id, { conditions: updated })
    logActivity(`Condition updated: ${editingCondition.original} → ${editingCondition.value.trim()}`)
    goeyToast.success("Condition updated")
    setEditConditionOpen(false)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Doctors */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Stethoscope className="h-4 w-4 text-primary" />
            </div>
            Doctors
          </CardTitle>
          <Dialog
            open={addDoctorOpen}
            onOpenChange={(open) => {
              if (!open) setEditDoctorIndex(null)
              setAddDoctorOpen(open)
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => openDoctorForm()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editDoctorIndex !== null ? "Edit" : "Add"} Doctor</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div>
                  <Label htmlFor="doc-name">Doctor Name</Label>
                  <Input
                    id="doc-name"
                    placeholder="Dr. Jane Smith"
                    value={doctorForm.name}
                    onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="doc-specialty">Specialty</Label>
                  <Input
                    id="doc-specialty"
                    placeholder="Primary Care"
                    value={doctorForm.specialty}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="doc-phone">Phone</Label>
                  <Input
                    id="doc-phone"
                    placeholder="(555) 123-4567"
                    value={doctorForm.phone}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDoctorOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDoctor} disabled={!doctorForm.name.trim()}>
                  {editDoctorIndex !== null ? "Save" : "Add Doctor"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {client.doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Stethoscope className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No doctors on file</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a doctor to keep their information handy.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {client.doctors.map((doc, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-2 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.specialty} · {doc.phone}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openDoctorForm(doc, i)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit doctor</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemoveDoctor(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove doctor</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
              <Pill className="h-4 w-4 text-chart-3" />
            </div>
            Medications
          </CardTitle>
          <Dialog
            open={addMedOpen}
            onOpenChange={(open) => {
              if (!open) setEditMedIndex(null)
              setAddMedOpen(open)
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => openMedForm()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editMedIndex !== null ? "Edit" : "Add"} Medication</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div>
                  <Label htmlFor="med-name">Medication Name</Label>
                  <Input
                    id="med-name"
                    placeholder="Lisinopril"
                    value={medForm.name}
                    onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="med-dosage">Dosage</Label>
                  <Input
                    id="med-dosage"
                    placeholder="10mg"
                    value={medForm.dosage}
                    onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="med-freq">Frequency</Label>
                  <Input
                    id="med-freq"
                    placeholder="Daily"
                    value={medForm.frequency}
                    onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMedOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMed} disabled={!medForm.name.trim()}>
                  {editMedIndex !== null ? "Save" : "Add Medication"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {client.medications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Pill className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No medications on file</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add medications to track what this client takes.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {client.medications.map((med, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-2 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{med.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {med.dosage} · {med.frequency}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openMedForm(med, i)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit medication</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemoveMed(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove medication</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pharmacies */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
              <Building2 className="h-4 w-4 text-chart-2" />
            </div>
            Pharmacies
          </CardTitle>
          <Dialog
            open={pharmDialogOpen}
            onOpenChange={(open) => {
              if (!open) setEditPharmIndex(null)
              setPharmDialogOpen(open)
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => openPharmForm()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editPharmIndex !== null ? "Edit" : "Add"} Pharmacy</DialogTitle>
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
                <Button variant="outline" onClick={() => setPharmDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSavePharmacy} disabled={!pharmForm.name.trim()}>
                  {editPharmIndex !== null ? "Save" : "Add"} Pharmacy
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {!(client.pharmacies ?? []).length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No pharmacy on file</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add pharmacy details for prescriptions.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {(client.pharmacies ?? []).map((pharm, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-2 py-3.5">
                  <div className="min-w-0 flex-1 space-y-0.5 text-sm">
                    <p className="font-medium text-foreground">{pharm.name}</p>
                    <p className="text-muted-foreground">{pharm.phone}</p>
                    <p className="text-muted-foreground">{pharm.address}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openPharmForm(pharm, i)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit pharmacy</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemovePharmacy(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove pharmacy</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allergies & Conditions */}
      <Card className="overflow-hidden lg:col-span-2">
        <CardHeader className="border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            Allergies & Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-0">
          <div className="pt-3.5">
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
                    className="flex cursor-default items-center gap-0.5 border-destructive/20 bg-destructive/10 text-destructive text-xs"
                  >
                    {a}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 rounded-full p-0 hover:bg-destructive/20"
                          aria-label={`Options for ${a}`}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingAllergy({ value: a, original: a })
                            setEditAllergyOpen(true)
                          }}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemoveAllergy(a)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Badge>
                ))
              )}
            </div>
            <Dialog open={editAllergyOpen} onOpenChange={setEditAllergyOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Allergy</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <Label htmlFor="edit-allergy">Allergy</Label>
                  <Input
                    id="edit-allergy"
                    value={editingAllergy.value}
                    onChange={(e) =>
                      setEditingAllergy((prev) => ({ ...prev, value: e.target.value }))
                    }
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditAllergyOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditAllergy} disabled={!editingAllergy.value.trim()}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                    className="flex cursor-default items-center gap-0.5 text-xs"
                  >
                    {c}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 rounded-full p-0 hover:bg-muted-foreground/20"
                          aria-label={`Options for ${c}`}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingCondition({ value: c, original: c })
                            setEditConditionOpen(true)
                          }}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemoveCondition(c)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Badge>
                ))
              )}
            </div>
            <Dialog open={editConditionOpen} onOpenChange={setEditConditionOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Condition</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <Label htmlFor="edit-condition">Condition</Label>
                  <Input
                    id="edit-condition"
                    value={editingCondition.value}
                    onChange={(e) =>
                      setEditingCondition((prev) => ({ ...prev, value: e.target.value }))
                    }
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditConditionOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditCondition} disabled={!editingCondition.value.trim()}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
