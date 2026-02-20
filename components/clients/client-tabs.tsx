"use client"

import { useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import {
  Eye,
  EyeOff,
  ShieldAlert,
  Stethoscope,
  Pill,
  Building2,
  AlertTriangle,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  StickyNote,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  FileText,
  Shield,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"
import type { Client, Activity, Task, ActivityType, Doctor, Medication, PlanType } from "@/lib/types"

const activityIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  email: Mail,
  text: MessageSquare,
  appointment: Calendar,
  note: StickyNote,
}

interface ClientTabsProps {
  client: Client
  activities: Activity[]
  tasks: Task[]
}

export function ClientTabs({ client, activities, tasks }: ClientTabsProps) {
  const [showMedicare, setShowMedicare] = useState(false)
  const [revealDialog, setRevealDialog] = useState(false)
  const { completeTask, updateClient, addActivity } = useCRMStore()

  // Add Doctor state
  const [addDoctorOpen, setAddDoctorOpen] = useState(false)
  const [newDoctor, setNewDoctor] = useState<Doctor>({ name: "", specialty: "", phone: "" })

  // Add Medication state
  const [addMedOpen, setAddMedOpen] = useState(false)
  const [newMed, setNewMed] = useState<Medication>({ name: "", dosage: "", frequency: "" })

  // Edit Pharmacy state
  const [editPharmOpen, setEditPharmOpen] = useState(false)
  const [pharmForm, setPharmForm] = useState({
    name: client.pharmacy.name,
    phone: client.pharmacy.phone,
    address: client.pharmacy.address,
  })

  // Add Allergy / Condition state
  const [addAllergyOpen, setAddAllergyOpen] = useState(false)
  const [newAllergy, setNewAllergy] = useState("")
  const [addConditionOpen, setAddConditionOpen] = useState(false)
  const [newCondition, setNewCondition] = useState("")

  // Add Note state
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState("")

  // Add/Edit Coverage state
  const [editCoverageOpen, setEditCoverageOpen] = useState(false)
  const [coverageForm, setCoverageForm] = useState({
    planType: (client.coverage?.planType || "MA") as PlanType,
    carrier: client.coverage?.carrier || "",
    planName: client.coverage?.planName || "",
    effectiveDate: client.coverage?.effectiveDate?.split("T")[0] || "",
    applicationId: client.coverage?.applicationId || "",
    premium: client.coverage?.premium?.toString() || "0",
    lastReviewDate: client.coverage?.lastReviewDate?.split("T")[0] || "",
  })

  const maskMedicare = (num: string) => {
    if (!num) return "Not on file"
    if (showMedicare) return num
    return num.replace(/[A-Z0-9]/gi, (_, i: number) => (i > num.length - 5 ? _ : "*"))
  }

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const pendingTasks = tasks.filter((t) => !t.completedAt)
  const completedTasks = tasks.filter((t) => t.completedAt)

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

  // Handlers
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

  const handleAddNote = () => {
    if (!noteText.trim()) return
    addActivity({
      id: `act-${Date.now()}`,
      relatedType: "Client",
      relatedId: client.id,
      type: "note",
      description: noteText.trim(),
      createdAt: new Date().toISOString(),
      createdBy: "Sarah Mitchell",
    })
    setNoteText("")
    setAddNoteOpen(false)
    goeyToast.success("Note added")
  }

  const handleSaveCoverage = () => {
    if (!coverageForm.carrier.trim() || !coverageForm.planName.trim()) return
    updateClient(client.id, {
      coverage: {
        planType: coverageForm.planType,
        carrier: coverageForm.carrier,
        planName: coverageForm.planName,
        effectiveDate: coverageForm.effectiveDate || new Date().toISOString(),
        applicationId: coverageForm.applicationId,
        premium: parseFloat(coverageForm.premium) || 0,
        lastReviewDate: coverageForm.lastReviewDate || new Date().toISOString(),
      },
    })
    logActivity(
      client.coverage
        ? `Coverage updated: ${coverageForm.carrier} ${coverageForm.planName}`
        : `Coverage added: ${coverageForm.carrier} ${coverageForm.planName}`
    )
    setEditCoverageOpen(false)
    goeyToast.success(client.coverage ? "Coverage updated" : "Coverage added")
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="health">Health Info</TabsTrigger>
        <TabsTrigger value="medicare">Medicare</TabsTrigger>
        <TabsTrigger value="coverage">Coverage</TabsTrigger>
      </TabsList>

      {/* OVERVIEW TAB */}
      <TabsContent value="overview" className="mt-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Language</span>
                <span className="text-foreground">{client.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preferred Contact</span>
                <span className="capitalize text-foreground">{client.preferredContactMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right text-foreground">
                  {client.address}, {client.city}, {client.state} {client.zip}
                </span>
              </div>
              {client.householdMembers && client.householdMembers.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Household</span>
                  <span className="text-foreground">{client.householdMembers.join(", ")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {pendingTasks.length} pending
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No tasks</p>
              ) : (
                <div className="divide-y">
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => completeTask(task.id)}
                      >
                        <Clock className="h-3.5 w-3.5 text-warning" />
                        <span className="sr-only">Complete task</span>
                      </Button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {format(parseLocalDate(task.dueDate), "MMM d")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {completedTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 px-5 py-3 opacity-60">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground line-through">{task.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline + Add Note */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add a Note</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <Label htmlFor="note-text">Note</Label>
                    <Textarea
                      id="note-text"
                      placeholder="Enter your note about this client..."
                      rows={4}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddNoteOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddNote} disabled={!noteText.trim()}>
                      Save Note
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {sortedActivities.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No activity recorded</p>
              ) : (
                <div className="divide-y">
                  {sortedActivities.map((activity) => {
                    const Icon = activityIcons[activity.type]
                    return (
                      <div key={activity.id} className="flex items-start gap-3 px-5 py-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground">{activity.description}</p>
                          {activity.outcome && (
                            <p className="text-xs text-muted-foreground">
                              Outcome: {activity.outcome}
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {activity.createdBy} &middot;{" "}
                            {formatDistanceToNow(new Date(activity.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* HEALTH TAB */}
      <TabsContent value="health" className="mt-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Doctors */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Stethoscope className="h-4 w-4 text-primary" />
                Doctors
              </CardTitle>
              <Dialog open={addDoctorOpen} onOpenChange={setAddDoctorOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
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
            <CardContent className="p-0">
              {client.doctors.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No doctors on file</p>
              ) : (
                <div className="divide-y">
                  {client.doctors.map((doc, i) => (
                    <div key={i} className="group flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.specialty} &middot; {doc.phone}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleRemoveDoctor(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
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
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Pill className="h-4 w-4 text-primary" />
                Medications
              </CardTitle>
              <Dialog open={addMedOpen} onOpenChange={setAddMedOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
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
            <CardContent className="p-0">
              {client.medications.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No medications on file</p>
              ) : (
                <div className="divide-y">
                  {client.medications.map((med, i) => (
                    <div key={i} className="group flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{med.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {med.dosage} &middot; {med.frequency}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleRemoveMed(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
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
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-primary" />
                Pharmacy
              </CardTitle>
              <Dialog open={editPharmOpen} onOpenChange={setEditPharmOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    {client.pharmacy.name ? "Edit" : (
                      <>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
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
            <CardContent className="text-sm">
              {client.pharmacy.name ? (
                <>
                  <p className="font-medium text-foreground">{client.pharmacy.name}</p>
                  <p className="text-muted-foreground">{client.pharmacy.phone}</p>
                  <p className="text-muted-foreground">{client.pharmacy.address}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No pharmacy on file</p>
              )}
            </CardContent>
          </Card>

          {/* Allergies & Conditions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Allergies & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Allergies</p>
                  <Dialog open={addAllergyOpen} onOpenChange={setAddAllergyOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
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
                <div className="mt-1 flex flex-wrap gap-1">
                  {client.allergies.length === 0 ? (
                    <span className="text-sm text-muted-foreground">None reported</span>
                  ) : (
                    client.allergies.map((a) => (
                      <Badge
                        key={a}
                        variant="outline"
                        className="group cursor-default bg-destructive/10 text-destructive border-destructive/20 text-xs"
                      >
                        {a}
                        <button
                          onClick={() => handleRemoveAllergy(a)}
                          className="ml-1 hidden h-3 w-3 items-center justify-center rounded-full hover:bg-destructive/20 group-hover:inline-flex"
                          aria-label={`Remove ${a}`}
                        >
                          <span className="text-[10px]">x</span>
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <Separator className="mb-4" />
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Conditions</p>
                  <Dialog open={addConditionOpen} onOpenChange={setAddConditionOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
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
                <div className="mt-1 flex flex-wrap gap-1">
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
                          className="ml-1 hidden h-3 w-3 items-center justify-center rounded-full hover:bg-muted group-hover:inline-flex"
                          aria-label={`Remove ${c}`}
                        >
                          <span className="text-[10px]">x</span>
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* MEDICARE TAB */}
      <TabsContent value="medicare" className="mt-4">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Medicare Information
              </CardTitle>
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning text-[11px]">
                Sensitive Data
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Protected Health Information (PHI)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This section contains sensitive data protected under HIPAA. In production,
                    data would be encrypted at rest and in transit, with role-based access
                    controls and full audit logging.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Medicare Number</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="font-mono text-sm text-foreground">
                    {maskMedicare(client.medicareNumber)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      if (showMedicare) {
                        setShowMedicare(false)
                      } else {
                        setRevealDialog(true)
                      }
                    }}
                  >
                    {showMedicare ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    <span className="sr-only">
                      {showMedicare ? "Hide" : "Reveal"} Medicare number
                    </span>
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Part A Effective Date</p>
                <p className="mt-1 text-sm text-foreground">
                  {client.partAEffectiveDate
                    ? format(parseLocalDate(client.partAEffectiveDate), "MMMM d, yyyy")
                    : "Not on file"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Part B Effective Date</p>
                <p className="mt-1 text-sm text-foreground">
                  {client.partBEffectiveDate
                    ? format(parseLocalDate(client.partBEffectiveDate), "MMMM d, yyyy")
                    : "Not on file"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={revealDialog} onOpenChange={setRevealDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reveal Sensitive Data</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to reveal the Medicare number for{" "}
                <span className="font-medium text-foreground">
                  {client.firstName} {client.lastName}
                </span>
                . This action will be logged in the audit trail. Make sure you are in a private
                and secure environment before proceeding.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowMedicare(true)
                  setRevealDialog(false)
                }}
              >
                Reveal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TabsContent>

      {/* COVERAGE TAB */}
      <TabsContent value="coverage" className="mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-primary" />
              {client.coverage ? "Current Coverage" : "No Coverage on File"}
            </CardTitle>
            <Dialog open={editCoverageOpen} onOpenChange={setEditCoverageOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {client.coverage ? "Edit" : (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Coverage
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{client.coverage ? "Edit" : "Add"} Coverage</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Plan Type</Label>
                      <Select
                        value={coverageForm.planType}
                        onValueChange={(v) =>
                          setCoverageForm({ ...coverageForm, planType: v as PlanType })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MA">Medicare Advantage (MA)</SelectItem>
                          <SelectItem value="MAPD">MA with Part D (MAPD)</SelectItem>
                          <SelectItem value="PDP">Part D (PDP)</SelectItem>
                          <SelectItem value="Supp">Medigap / Supplement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="cov-carrier">Carrier</Label>
                      <Input
                        id="cov-carrier"
                        placeholder="Aetna"
                        value={coverageForm.carrier}
                        onChange={(e) =>
                          setCoverageForm({ ...coverageForm, carrier: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cov-plan">Plan Name</Label>
                    <Input
                      id="cov-plan"
                      placeholder="Aetna Medicare Advantage Premier"
                      value={coverageForm.planName}
                      onChange={(e) =>
                        setCoverageForm({ ...coverageForm, planName: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="cov-eff">Effective Date</Label>
                      <Input
                        id="cov-eff"
                        type="date"
                        value={coverageForm.effectiveDate}
                        onChange={(e) =>
                          setCoverageForm({ ...coverageForm, effectiveDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="cov-premium">Monthly Premium ($)</Label>
                      <Input
                        id="cov-premium"
                        type="number"
                        step="0.01"
                        min="0"
                        value={coverageForm.premium}
                        onChange={(e) =>
                          setCoverageForm({ ...coverageForm, premium: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="cov-app">Application ID</Label>
                      <Input
                        id="cov-app"
                        placeholder="AET-2026-001234"
                        value={coverageForm.applicationId}
                        onChange={(e) =>
                          setCoverageForm({ ...coverageForm, applicationId: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="cov-review">Last Review Date</Label>
                      <Input
                        id="cov-review"
                        type="date"
                        value={coverageForm.lastReviewDate}
                        onChange={(e) =>
                          setCoverageForm({ ...coverageForm, lastReviewDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditCoverageOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveCoverage}
                    disabled={!coverageForm.carrier.trim() || !coverageForm.planName.trim()}
                  >
                    Save Coverage
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {client.coverage ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Plan Type</p>
                  <p className="mt-1 text-sm text-foreground">
                    {client.coverage.planType === "MA" && "Medicare Advantage"}
                    {client.coverage.planType === "MAPD" && "MA with Part D"}
                    {client.coverage.planType === "PDP" && "Part D (PDP)"}
                    {client.coverage.planType === "Supp" && "Medigap / Supplement"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Carrier</p>
                  <p className="mt-1 text-sm text-foreground">{client.coverage.carrier}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Plan Name</p>
                  <p className="mt-1 text-sm text-foreground">{client.coverage.planName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Effective Date</p>
                  <p className="mt-1 text-sm text-foreground">
                    {format(parseLocalDate(client.coverage.effectiveDate), "MMMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Application ID</p>
                  <code className="mt-1 block font-mono text-sm text-foreground">
                    {client.coverage.applicationId}
                  </code>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Monthly Premium</p>
                  <p className="mt-1 text-sm text-foreground">
                    {client.coverage.premium === 0
                      ? "$0.00"
                      : `$${client.coverage.premium.toFixed(2)}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Last Review</p>
                  <p className="mt-1 text-sm text-foreground">
                    {format(parseLocalDate(client.coverage.lastReviewDate), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No coverage information on file yet.
                </p>
                <p className="text-xs text-muted-foreground">
                  Click "Add Coverage" above to add plan details.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
