"use client"

import { useState, useEffect, Fragment } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { parseLocalDate, getAgeFromDob } from "@/lib/date-utils"
import {
  User,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Calendar,
  CalendarPlus,
  StickyNote,
  FileText,
  BarChart3,
  CheckCircle2,
  Clock,
  ChevronRight,
  Trash2,
  MoreVertical,
  Pencil,
  CallOutgoing,
  Sent,
} from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { useCRMStore } from "@/lib/store"
import { formatPhoneNumber } from "@/lib/utils"
import { toast } from "sonner"
import { AddressForm } from "@/components/clients/address-form"
import type { ActivityType, ClientPhone, ClientEmail, ClientPhoneType, ClientAddress } from "@/lib/types"
import type { SectionProps } from "./types"

function createEmptyAddress(): ClientAddress {
  return {
    id: crypto.randomUUID(),
    type: "Home",
    address: "",
    city: "",
    state: "",
    zip: "",
    isPreferred: false,
  }
}

const PHONE_TYPES: ClientPhoneType[] = ["Cell", "Home", "Work", "Other"]

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

const activityIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  email: Mail,
  text: MessageSquare,
  appointment: CalendarPlus,
  note: StickyNote,
  coverage: FileText,
  flow: BarChart3,
}

const activityColors: Record<ActivityType, string> = {
  call: "bg-chart-1/10 text-chart-1",
  email: "bg-chart-2/10 text-chart-2",
  text: "bg-chart-5/10 text-chart-5",
  appointment: "bg-chart-4/10 text-chart-4",
  note: "bg-muted text-muted-foreground",
  coverage: "bg-chart-3/10 text-chart-3",
  flow: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
}

/** Derive display type for backwards compat: note-type activities with coverage or flow descriptions. */
function getActivityDisplayType(activity: { type: ActivityType; description: string }): ActivityType {
  if (activity.type === "coverage") return "coverage"
  if (
    activity.type === "note" &&
    /^Coverage (added|updated|removed):/.test(activity.description)
  ) {
    return "coverage"
  }
  if (activity.type === "flow") return "flow"
  if (activity.type === "note" && isFlowActivityDescription(activity.description)) {
    return "flow"
  }
  return activity.type
}

function isFlowActivityDescription(desc: string): boolean {
  return (
    (desc.startsWith("Moved to ") && desc.includes(" in ")) ||
    (desc.startsWith("Added to ") && (desc.includes("(stage:") || desc.includes("— Stage:"))) ||
    (desc.startsWith("Removed from ") && desc.endsWith(" Flow"))
  )
}

const QUICK_ACTIVITY_LIMIT = 4

function getClientDisplayName(c: { title?: string; firstName: string; lastName: string; suffix?: string }): string {
  return [c.title, c.firstName, c.lastName, c.suffix].filter(Boolean).join(" ")
}

export function ContactSection({
  client,
  activities,
  tasks,
  sectionBasePath,
  onNavigateToSection,
  onEditPersonal,
  onEditAddresses,
}: SectionProps) {
  const [mounted, setMounted] = useState(false)
  const { clients, completeTask, updateClient, addActivity, currentAgent } = useCRMStore()
  const spouse = client.spouseId ? clients.find((c) => c.id === client.spouseId) : null
  const sourceClientName = getClientDisplayName(client)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [alsoUpdateSpouse, setAlsoUpdateSpouse] = useState(false)
  const [addMode, setAddMode] = useState<"phone" | "email" | null>(null)
  const [addPhone, setAddPhone] = useState(() => ({ ...createEmptyPhone(), isPreferred: true }))
  const [addEmail, setAddEmail] = useState(() => ({ ...createEmptyEmail(), isPreferred: true }))
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null)
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null)
  const [editPhoneDraft, setEditPhoneDraft] = useState<ClientPhone | null>(null)
  const [editEmailDraft, setEditEmailDraft] = useState<ClientEmail | null>(null)
  const [addAddressDialogOpen, setAddAddressDialogOpen] = useState(false)
  const [addAddressDraft, setAddAddressDraft] = useState<ClientAddress | null>(null)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [editingAddressDraft, setEditingAddressDraft] = useState<ClientAddress | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const age = mounted ? getAgeFromDob(client.dob) : 0
  const pendingTasks = tasks.filter((t) => !t.completedAt)
  const completedTasks = tasks.filter((t) => t.completedAt)
  const clientNotes = client.notes ?? []
  const clientNoteItems = clientNotes.map((n) => ({
    id: `client-note-${n.createdAt}`,
    type: "note" as const,
    description: n.text,
    createdAt: n.createdAt,
    createdBy: undefined as string | undefined,
  }))
  const allActivitiesAndNotes = [...activities, ...clientNoteItems]
  const sortedActivities = [...allActivitiesAndNotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const quickActivities = sortedActivities.slice(0, QUICK_ACTIVITY_LIMIT)

  const fullNameParts = [
    client.title,
    client.firstName,
    client.middleName,
    client.lastName,
    client.suffix,
  ].filter(Boolean) as string[]
  const fullName = fullNameParts.length > 0 ? fullNameParts.join(" ") : `${client.firstName} ${client.lastName}`
  const displayName = client.nickname
    ? [client.title, `${client.firstName} "${client.nickname}" ${client.lastName}`, client.suffix].filter(Boolean).join(" ")
    : fullName

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Personal Info - full width */}
      <Card className="overflow-hidden lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            Personal details
          </CardTitle>
          {onEditPersonal && (
            <Button variant="outline" size="sm" onClick={onEditPersonal}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="text-sm text-muted-foreground">Full name</span>
              <span className="text-sm font-medium text-foreground">
                {displayName}
              </span>
            </div>
            {client.gender && (
              <div className="flex items-center justify-between gap-4 px-6 py-3.5">
                <span className="text-sm text-muted-foreground">Gender</span>
                <span className="text-sm text-foreground">
                  {client.gender === "M" ? "Male" : "Female"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="text-sm text-muted-foreground">Date of birth</span>
              <span className="flex items-center gap-2 text-sm text-foreground">
                {mounted && (
                  <Badge variant="secondary" className="text-xs">Age {age}</Badge>
                )}
                {format(parseLocalDate(client.dob), "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="text-sm text-muted-foreground">Language</span>
              <span className="text-sm text-foreground">{client.language}</span>
            </div>
            {client.source && (
              <div className="flex items-center justify-between gap-4 px-6 py-3.5">
                <span className="text-sm text-muted-foreground">Source</span>
                <span className="text-sm text-foreground">{client.source}</span>
              </div>
            )}
            {client.nickname && (
              <div className="flex items-center justify-between gap-4 px-6 py-3.5">
                <span className="text-sm text-muted-foreground">Nickname</span>
                <span className="text-sm text-foreground">{client.nickname}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="text-sm text-muted-foreground">Spouse</span>
              {spouse ? (
                <span className="text-right text-sm">
                  <Link
                    href={`/clients/${spouse.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {[spouse.title, spouse.firstName, spouse.lastName, spouse.suffix].filter(Boolean).join(" ")}
                  </Link>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onEditPersonal}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  Add spouse
                </button>
              )}
            </div>
            {client.funFacts?.trim() && (
              <div className="flex items-start justify-between gap-4 px-6 py-3.5">
                <span className="text-sm text-muted-foreground shrink-0">Fun facts</span>
                <span className="text-sm text-foreground whitespace-pre-wrap text-right min-w-0">
                  {client.funFacts.trim()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact information: full width, phones left, emails right */}
      <Card className="overflow-hidden lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            Contact information
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => { setAddDialogOpen(true); setAddMode(null) }}>
            Add
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-4">
            {/* Phones (left) */}
            <div className="space-y-3">
              {client.phones?.length ? (
                <div className="space-y-3">
                  {(() => {
                    const phones = client.phones ?? []
                    const preferredPhone = phones.find((p) => p.isPreferred) ?? phones[0]
                    const secondaryPhones = phones.filter((p) => p.id !== preferredPhone?.id)
                    const orderedPhones = preferredPhone ? [preferredPhone, ...secondaryPhones] : []
                    return orderedPhones.map((phone, index) => {
                    const isEditing = editingPhoneId === phone.id
                    const draft = isEditing ? editPhoneDraft : null
                    return (
                      <Fragment key={phone.id}>
                        {index === 1 && (
                          <p className="text-xs font-medium text-muted-foreground pt-1">Secondary Numbers</p>
                        )}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {!isEditing ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                                <a href={`tel:${phone.number.replace(/\D/g, "")}`} aria-label="Call">
                                  <CallOutgoing className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPhoneId(phone.id)
                                  setEditPhoneDraft({ ...phone })
                                }}
                                className={`text-sm text-primary hover:underline text-left ${index === 0 ? "font-semibold" : "font-medium"}`}
                              >
                                {phone.type} - {formatPhoneNumber(phone.number)}
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    aria-label="Phone actions"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingPhoneId(phone.id)
                                      setEditPhoneDraft({ ...phone })
                                    }}
                                  >
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const next = (client.phones ?? []).filter((p) => p.id !== phone.id)
                                      if (phone.isPreferred && next.length) next[0] = { ...next[0], isPreferred: true }
                                      updateClient(client.id, { phones: next })
                                      toast.success("Phone removed")
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          ) : (
                            <>
                              <Select
                                value={draft?.type}
                                onValueChange={(v) => draft && setEditPhoneDraft({ ...draft, type: v as ClientPhoneType })}
                              >
                                <SelectTrigger className="h-8 w-[100px] shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PHONE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Input
                                value={draft?.number ?? ""}
                                onChange={(e) => {
                                  if (!draft) return
                                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                                  setEditPhoneDraft({ ...draft, number: formatPhoneNumber(digits) })
                                }}
                                placeholder="(555) 555-5555"
                                className="h-8 min-w-[140px] flex-1"
                              />
                              <Button size="sm" onClick={() => {
                                if (!draft?.number?.trim()) return
                                const updated = { ...draft, number: formatPhoneNumber(draft.number.trim()) }
                                const next = (client.phones ?? []).map((p) =>
                                  p.id === phone.id ? updated : { ...p, isPreferred: updated.isPreferred ? false : p.isPreferred }
                                )
                                if (next.length > 1 && !next.some((p) => p.isPreferred)) next[0] = { ...next[0], isPreferred: true }
                                updateClient(client.id, { phones: next })
                                if (alsoUpdateSpouse && spouse) {
                                  const spousePhones = spouse.phones ?? []
                                  const sameTypeIndex = spousePhones.findIndex((p) => p.type === updated.type)
                                  const spouseCopy = { ...updated, id: sameTypeIndex >= 0 ? spousePhones[sameTypeIndex].id : crypto.randomUUID() }
                                  const spouseNext = sameTypeIndex >= 0
                                    ? spousePhones.map((p, i) => (i === sameTypeIndex ? { ...spouseCopy, isPreferred: p.isPreferred } : { ...p, isPreferred: updated.isPreferred ? false : p.isPreferred }))
                                    : [...spousePhones.map((p) => ({ ...p, isPreferred: updated.isPreferred ? false : p.isPreferred })), spouseCopy]
                                  if (spouseNext.length > 1 && !spouseNext.some((p) => p.isPreferred)) spouseNext[0] = { ...spouseNext[0], isPreferred: true }
                                  updateClient(spouse.id, { phones: spouseNext })
                                  addActivity({
                                    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                                    relatedType: "Client",
                                    relatedId: spouse.id,
                                    type: "note",
                                    description: `Phone updated from ${sourceClientName}'s profile`,
                                    createdAt: new Date().toISOString(),
                                    createdBy: currentAgent,
                                  })
                                }
                                setEditingPhoneId(null)
                                setEditPhoneDraft(null)
                                toast.success(alsoUpdateSpouse && spouse ? "Phone updated on both profiles" : "Phone updated")
                              }}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingPhoneId(null); setEditPhoneDraft(null) }}>
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                        {isEditing && draft && (
                          <div className="mt-2 space-y-2 pl-0 border-l-2 border-muted pl-3">
                            {(client.phones?.length ?? 0) > 1 && (
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="radio"
                                  name={`preferred-phone-${phone.id}`}
                                  checked={draft.isPreferred}
                                  onChange={() => setEditPhoneDraft({ ...draft, isPreferred: true })}
                                />
                                Preferred
                              </label>
                            )}
                            {spouse && (
                              <div className="flex items-center gap-2 text-xs">
                                <Checkbox
                                  id={`edit-phone-also-spouse-${phone.id}`}
                                  checked={alsoUpdateSpouse}
                                  onCheckedChange={(v) => setAlsoUpdateSpouse(v === true)}
                                />
                                <label htmlFor={`edit-phone-also-spouse-${phone.id}`} className="cursor-pointer">Also update spouse</label>
                              </div>
                            )}
                            <Collapsible defaultOpen={!!draft.note?.trim()} className="group">
                              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                                Note
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <Textarea
                                  value={draft.note ?? ""}
                                  onChange={(e) => setEditPhoneDraft({ ...draft, note: e.target.value })}
                                  placeholder="Optional note"
                                  rows={2}
                                  className="mt-1 resize-none text-xs"
                                />
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                        {!isEditing && phone.note?.trim() && (
                          <Collapsible defaultOpen={false} className="group mt-1">
                            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                              Note
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-4 ml-0.5">
                                {phone.note}
                              </p>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    </Fragment>
                    )
                  })}
                  )()}
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-8">
                  <p className="text-sm text-muted-foreground">No phone</p>
                </div>
              )}
            </div>
            {/* Emails (right) */}
            <div className="space-y-3">
              {client.emails?.length ? (
                <div className="space-y-3">
                  {(() => {
                    const emails = client.emails ?? []
                    const preferredEmail = emails.find((e) => e.isPreferred) ?? emails[0]
                    const secondaryEmails = emails.filter((e) => e.id !== preferredEmail?.id)
                    const orderedEmails = preferredEmail ? [preferredEmail, ...secondaryEmails] : []
                    return orderedEmails.map((email, index) => {
                    const isEditing = editingEmailId === email.id
                    const draft = isEditing ? editEmailDraft : null
                    return (
                      <Fragment key={email.id}>
                        {index === 1 && (
                          <p className="text-xs font-medium text-muted-foreground pt-1">Secondary Emails</p>
                        )}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {!isEditing ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                                <a href={`mailto:${email.value}`} aria-label="Email">
                                  <Sent className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEmailId(email.id)
                                  setEditEmailDraft({ ...email })
                                }}
                                className={`text-sm text-primary hover:underline text-left ${index === 0 ? "font-semibold" : "font-medium"}`}
                              >
                                {email.value}
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    aria-label="Email actions"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingEmailId(email.id)
                                      setEditEmailDraft({ ...email })
                                    }}
                                  >
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const next = (client.emails ?? []).filter((e) => e.id !== email.id)
                                      if (email.isPreferred && next.length) next[0] = { ...next[0], isPreferred: true }
                                      updateClient(client.id, { emails: next })
                                      toast.success("Email removed")
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          ) : (
                            <>
                              <Input
                                type="email"
                                value={draft?.value ?? ""}
                                onChange={(e) => draft && setEditEmailDraft({ ...draft, value: e.target.value })}
                                placeholder="mary@email.com"
                                className="h-8 flex-1 min-w-0"
                              />
                              <Button size="sm" onClick={() => {
                                if (!draft?.value?.trim()) return
                                const updated = { ...draft, value: draft.value.trim() }
                                const next = (client.emails ?? []).map((e) =>
                                  e.id === email.id ? updated : { ...e, isPreferred: updated.isPreferred ? false : e.isPreferred }
                                )
                                if (next.length > 1 && !next.some((e) => e.isPreferred)) next[0] = { ...next[0], isPreferred: true }
                                updateClient(client.id, { emails: next })
                                if (alsoUpdateSpouse && spouse) {
                                  const spouseEmails = spouse.emails ?? []
                                  const preferredIndex = spouseEmails.findIndex((e) => e.isPreferred)
                                  const spouseCopy = { ...updated, id: preferredIndex >= 0 ? spouseEmails[preferredIndex].id : crypto.randomUUID() }
                                  const spouseNext = preferredIndex >= 0
                                    ? spouseEmails.map((e, i) => (i === preferredIndex ? spouseCopy : { ...e, isPreferred: updated.isPreferred ? false : e.isPreferred }))
                                    : [...spouseEmails.map((e) => ({ ...e, isPreferred: updated.isPreferred ? false : e.isPreferred })), spouseCopy]
                                  if (spouseNext.length > 1 && !spouseNext.some((e) => e.isPreferred)) spouseNext[0] = { ...spouseNext[0], isPreferred: true }
                                  updateClient(spouse.id, { emails: spouseNext })
                                  addActivity({
                                    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                                    relatedType: "Client",
                                    relatedId: spouse.id,
                                    type: "note",
                                    description: `Email updated from ${sourceClientName}'s profile`,
                                    createdAt: new Date().toISOString(),
                                    createdBy: currentAgent,
                                  })
                                }
                                setEditingEmailId(null)
                                setEditEmailDraft(null)
                                toast.success(alsoUpdateSpouse && spouse ? "Email updated on both profiles" : "Email updated")
                              }}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingEmailId(null); setEditEmailDraft(null) }}>
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                        {isEditing && draft && (
                          <div className="mt-2 space-y-2 pl-0 border-l-2 border-muted pl-3">
                            {(client.emails?.length ?? 0) > 1 && (
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="radio"
                                  name={`preferred-email-${email.id}`}
                                  checked={draft.isPreferred}
                                  onChange={() => setEditEmailDraft({ ...draft, isPreferred: true })}
                                />
                                Preferred
                              </label>
                            )}
                            {spouse && (
                              <div className="flex items-center gap-2 text-xs">
                                <Checkbox
                                  id={`edit-email-also-spouse-${email.id}`}
                                  checked={alsoUpdateSpouse}
                                  onCheckedChange={(v) => setAlsoUpdateSpouse(v === true)}
                                />
                                <label htmlFor={`edit-email-also-spouse-${email.id}`} className="cursor-pointer">Also update spouse</label>
                              </div>
                            )}
                            <Collapsible defaultOpen={!!draft.note?.trim()} className="group">
                              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                                Note
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <Textarea
                                  value={draft.note ?? ""}
                                  onChange={(e) => setEditEmailDraft({ ...draft, note: e.target.value })}
                                  placeholder="Optional note"
                                  rows={2}
                                  className="mt-1 resize-none text-xs"
                                />
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                        {!isEditing && email.note?.trim() && (
                          <Collapsible defaultOpen={false} className="group mt-1">
                            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                              Note
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-4 ml-0.5">
                                {email.note}
                              </p>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    </Fragment>
                    )
                  })}
                  )()}
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-8">
                  <p className="text-sm text-muted-foreground">No email</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 px-6 py-3.5 border-t">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              Preferred contact method
            </span>
            <Select
              value={client.preferredContactMethod}
              onValueChange={(v) => {
                updateClient(client.id, { preferredContactMethod: v as "phone" | "email" | "text" })
                toast.success("Preferred contact method updated")
              }}
            >
              <SelectTrigger className="w-[120px] h-8 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone" className="capitalize">Phone</SelectItem>
                <SelectItem value="email" className="capitalize">Email</SelectItem>
                <SelectItem value="text" className="capitalize">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Add contact dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open)
          if (!open) {
            setAddMode(null)
            setAddPhone({ ...createEmptyPhone(), isPreferred: true })
            setAddEmail({ ...createEmptyEmail(), isPreferred: true })
            setAlsoUpdateSpouse(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{addMode === null ? "Add contact" : addMode === "phone" ? "Add phone" : "Add email"}</DialogTitle>
            <DialogDescription>
              {addMode === null
                ? "Choose what to add."
                : addMode === "phone"
                  ? "Add a phone number."
                  : "Add an email address."}
            </DialogDescription>
          </DialogHeader>
          {addMode === null ? (
            <div className="flex flex-wrap gap-3 py-2">
              <Button
                variant="outline"
                className="min-h-[40px] flex-1 sm:flex-initial"
                onClick={() => {
                  setAddMode("phone")
                  const hasPhones = (client.phones?.length ?? 0) > 0
                  setAddPhone({ ...createEmptyPhone(), isPreferred: !hasPhones })
                }}
              >
                <Phone className="h-4 w-4 mr-2" />
                Phone
              </Button>
              <Button
                variant="outline"
                className="min-h-[40px] flex-1 sm:flex-initial"
                onClick={() => {
                  setAddMode("email")
                  const hasEmails = (client.emails?.length ?? 0) > 0
                  setAddEmail({ ...createEmptyEmail(), isPreferred: !hasEmails })
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          ) : addMode === "phone" ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (!addPhone.number?.trim()) {
                  toast.error("Enter a phone number")
                  return
                }
                const newPhone = { ...addPhone, number: formatPhoneNumber(addPhone.number.trim()) }
                const existing = (client.phones ?? []).map((p) => ({ ...p, isPreferred: newPhone.isPreferred ? false : p.isPreferred }))
                const next = [...existing, newPhone]
                if (next.length > 1 && !next.some((p) => p.isPreferred)) next[next.length - 1] = { ...next[next.length - 1], isPreferred: true }
                updateClient(client.id, { phones: next })
                if (alsoUpdateSpouse && spouse) {
                  const spouseCopy = { ...newPhone, id: crypto.randomUUID() }
                  const spouseExisting = (spouse.phones ?? []).map((p) => ({ ...p, isPreferred: spouseCopy.isPreferred ? false : p.isPreferred }))
                  const spouseNext = [...spouseExisting, spouseCopy]
                  if (spouseNext.length > 1 && !spouseNext.some((p) => p.isPreferred)) spouseNext[spouseNext.length - 1] = { ...spouseNext[spouseNext.length - 1], isPreferred: true }
                  updateClient(spouse.id, { phones: spouseNext })
                  addActivity({
                    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    relatedType: "Client",
                    relatedId: spouse.id,
                    type: "note",
                    description: `Phone added from ${sourceClientName}'s profile`,
                    createdAt: new Date().toISOString(),
                    createdBy: currentAgent,
                  })
                }
                toast.success(alsoUpdateSpouse && spouse ? "Phone added to both profiles" : "Phone added")
                setAddDialogOpen(false)
                setAddMode(null)
                setAddPhone({ ...createEmptyPhone(), isPreferred: true })
              }}
            >
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={addPhone.type}
                  onValueChange={(v) => setAddPhone((p) => ({ ...p, type: v as ClientPhoneType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PHONE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Number</Label>
                <Input
                  value={addPhone.number}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                    setAddPhone((p) => ({ ...p, number: formatPhoneNumber(digits) }))
                  }}
                  placeholder="(555) 555-5555"
                />
              </div>
              {(client.phones?.length ?? 0) > 0 && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={addPhone.isPreferred}
                    onChange={(e) => setAddPhone((p) => ({ ...p, isPreferred: e.target.checked }))}
                  />
                  <span className="text-sm">Preferred phone</span>
                </label>
              )}
              {spouse && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="add-phone-also-spouse"
                    checked={alsoUpdateSpouse}
                    onCheckedChange={(v) => setAlsoUpdateSpouse(v === true)}
                  />
                  <label htmlFor="add-phone-also-spouse" className="text-sm cursor-pointer">Also update spouse</label>
                </div>
              )}
              <Collapsible className="group">
                <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                  Note
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea
                    value={addPhone.note ?? ""}
                    onChange={(e) => setAddPhone((p) => ({ ...p, note: e.target.value }))}
                    placeholder="Optional note"
                    rows={2}
                    className="mt-2 resize-none text-sm"
                  />
                </CollapsibleContent>
              </Collapsible>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setAddDialogOpen(false); setAddMode(null) }}>
                  Cancel
                </Button>
                <Button type="submit">Add phone</Button>
              </DialogFooter>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (!addEmail.value?.trim()) {
                  toast.error("Enter an email address")
                  return
                }
                const newEmail = { ...addEmail, value: addEmail.value.trim() }
                const existing = (client.emails ?? []).map((em) => ({ ...em, isPreferred: newEmail.isPreferred ? false : em.isPreferred }))
                const next = [...existing, newEmail]
                if (next.length > 1 && !next.some((em) => em.isPreferred)) next[next.length - 1] = { ...next[next.length - 1], isPreferred: true }
                updateClient(client.id, { emails: next })
                if (alsoUpdateSpouse && spouse) {
                  const spouseCopy = { ...newEmail, id: crypto.randomUUID() }
                  const spouseExisting = (spouse.emails ?? []).map((em) => ({ ...em, isPreferred: spouseCopy.isPreferred ? false : em.isPreferred }))
                  const spouseNext = [...spouseExisting, spouseCopy]
                  if (spouseNext.length > 1 && !spouseNext.some((em) => em.isPreferred)) spouseNext[spouseNext.length - 1] = { ...spouseNext[spouseNext.length - 1], isPreferred: true }
                  updateClient(spouse.id, { emails: spouseNext })
                  addActivity({
                    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    relatedType: "Client",
                    relatedId: spouse.id,
                    type: "note",
                    description: `Email added from ${sourceClientName}'s profile`,
                    createdAt: new Date().toISOString(),
                    createdBy: currentAgent,
                  })
                }
                toast.success(alsoUpdateSpouse && spouse ? "Email added to both profiles" : "Email added")
                setAddDialogOpen(false)
                setAddMode(null)
                setAddEmail({ ...createEmptyEmail(), isPreferred: true })
              }}
            >
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={addEmail.value}
                  onChange={(e) => setAddEmail((p) => ({ ...p, value: e.target.value }))}
                  placeholder="mary@email.com"
                />
              </div>
              {(client.emails?.length ?? 0) > 0 && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={addEmail.isPreferred}
                    onChange={(e) => setAddEmail((p) => ({ ...p, isPreferred: e.target.checked }))}
                  />
                  <span className="text-sm">Preferred email</span>
                </label>
              )}
              {spouse && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="add-email-also-spouse"
                    checked={alsoUpdateSpouse}
                    onCheckedChange={(v) => setAlsoUpdateSpouse(v === true)}
                  />
                  <label htmlFor="add-email-also-spouse" className="text-sm cursor-pointer">Also update spouse</label>
                </div>
              )}
              <Collapsible className="group">
                <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                  Note
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea
                    value={addEmail.note ?? ""}
                    onChange={(e) => setAddEmail((p) => ({ ...p, note: e.target.value }))}
                    placeholder="Optional note"
                    rows={2}
                    className="mt-2 resize-none text-sm"
                  />
                </CollapsibleContent>
              </Collapsible>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setAddDialogOpen(false); setAddMode(null) }}>
                  Cancel
                </Button>
                <Button type="submit">Add email</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Addresses: full-width container */}
      <Card className="overflow-hidden lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            Addresses
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAddAddressDraft({
                ...createEmptyAddress(),
                isPreferred: (client.addresses?.length ?? 0) === 0,
              })
              setAddAddressDialogOpen(true)
            }}
          >
            Add
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {client.addresses && client.addresses.length > 0 ? (
              client.addresses.map((addr) => {
                const line1 = [addr.address, addr.unit].filter(Boolean).join(", ")
                const line2 = [addr.city, addr.state, addr.zip].filter(Boolean).join(", ")
                const fullAddress = [line1, line2].filter(Boolean).join(", ")
                const displayAddress = addr.county ? `${fullAddress} (${addr.county})` : fullAddress
                const showPreferred =
                  (client.addresses?.length ?? 0) > 1 && addr.isPreferred
                return (
                  <div
                    key={addr.id}
                    className="flex items-center gap-4 px-6 py-3.5"
                  >
                    <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                      {addr.type}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddressId(addr.id)
                        setEditingAddressDraft({ ...addr })
                      }}
                      className="min-w-0 flex-1 text-left text-sm text-primary hover:underline"
                    >
                      {displayAddress}
                    </button>
                    {showPreferred && (
                      <Badge variant="outline" className="shrink-0 text-xs border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                        Preferred
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          aria-label="Address actions"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingAddressId(addr.id)
                            setEditingAddressDraft({ ...addr })
                          }}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const next = (client.addresses ?? []).filter(
                              (a) => a.id !== addr.id
                            )
                            if (addr.isPreferred && next.length > 0) {
                              next[0] = { ...next[0], isPreferred: true }
                            }
                            updateClient(client.id, { addresses: next })
                            toast.success("Address removed")
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
                              "_blank"
                            )
                          }}
                        >
                          <MapPin className="mr-2 h-3.5 w-3.5" />
                          Get directions
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })
            ) : (
              <div className="flex items-center justify-between gap-4 px-6 py-3.5">
                <span className="text-sm text-muted-foreground">Address</span>
                <span className="text-sm text-muted-foreground">No address</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Address dialog */}
      <Dialog
        open={addAddressDialogOpen}
        onOpenChange={(open) => {
          setAddAddressDialogOpen(open)
          if (!open) {
            setAddAddressDraft(null)
            setAlsoUpdateSpouse(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add address</DialogTitle>
            <DialogDescription>Add a new address for this client.</DialogDescription>
          </DialogHeader>
          {addAddressDraft && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const draft = addAddressDraft
                if (!draft.address?.trim() && !draft.city?.trim()) {
                  toast.error("Please enter at least street or city")
                  return
                }
                const newAddr: ClientAddress = {
                  ...draft,
                  id: draft.id || crypto.randomUUID(),
                  isPreferred:
                    (client.addresses?.length ?? 0) === 0 ? true : (draft.isPreferred ?? false),
                }
                const next = [...(client.addresses ?? []), newAddr]
                updateClient(client.id, { addresses: next })
                if (alsoUpdateSpouse && spouse) {
                  const spouseCopy: ClientAddress = {
                    ...newAddr,
                    id: crypto.randomUUID(),
                  }
                  const spouseNext = [...(spouse.addresses ?? []), spouseCopy]
                  updateClient(spouse.id, { addresses: spouseNext })
                  addActivity({
                    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    relatedType: "Client",
                    relatedId: spouse.id,
                    type: "note",
                    description: `Address added from ${sourceClientName}'s profile`,
                    createdAt: new Date().toISOString(),
                    createdBy: currentAgent,
                  })
                }
                toast.success(alsoUpdateSpouse && spouse ? "Address added to both profiles" : "Address added")
                setAddAddressDialogOpen(false)
                setAddAddressDraft(null)
              }}
              className="grid gap-4 py-2"
            >
              <AddressForm
                address={addAddressDraft}
                onChange={(patch) =>
                  setAddAddressDraft((prev) => (prev ? { ...prev, ...patch } : null))
                }
                showType={true}
                showPreferred={(client.addresses?.length ?? 0) >= 1}
                allowManualEntry={true}
                dialogOpen={addAddressDialogOpen}
              />
              {spouse && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="add-address-also-spouse"
                    checked={alsoUpdateSpouse}
                    onCheckedChange={(v) => setAlsoUpdateSpouse(v === true)}
                  />
                  <label htmlFor="add-address-also-spouse" className="text-sm cursor-pointer">Also update spouse</label>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddAddressDialogOpen(false)
                    setAddAddressDraft(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Add address</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Address dialog */}
      <Dialog
        open={editingAddressId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAddressId(null)
            setEditingAddressDraft(null)
            setAlsoUpdateSpouse(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit address</DialogTitle>
            <DialogDescription>Update this address.</DialogDescription>
          </DialogHeader>
          {editingAddressDraft && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const draft = editingAddressDraft
                if (!draft.address?.trim() && !draft.city?.trim()) {
                  toast.error("Please enter at least street or city")
                  return
                }
                const next = (client.addresses ?? []).map((a) =>
                  a.id === editingAddressId ? { ...a, ...draft } : a
                )
                if (draft.isPreferred && (client.addresses?.length ?? 0) > 1) {
                  const normalized = next.map((a) => ({
                    ...a,
                    isPreferred: a.id === editingAddressId,
                  }))
                  updateClient(client.id, { addresses: normalized })
                } else {
                  updateClient(client.id, { addresses: next })
                }
                if (alsoUpdateSpouse && spouse) {
                  const spouseAddrs = spouse.addresses ?? []
                  const sameTypeIndex = spouseAddrs.findIndex((a) => a.type === draft.type)
                  const spouseCopy: ClientAddress = {
                    ...draft,
                    id: sameTypeIndex >= 0 ? spouseAddrs[sameTypeIndex].id : crypto.randomUUID(),
                  }
                  const spouseNext = sameTypeIndex >= 0
                    ? spouseAddrs.map((a, i) => (i === sameTypeIndex ? spouseCopy : a))
                    : [...spouseAddrs, spouseCopy]
                  updateClient(spouse.id, { addresses: spouseNext })
                  addActivity({
                    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    relatedType: "Client",
                    relatedId: spouse.id,
                    type: "note",
                    description: `Address updated from ${sourceClientName}'s profile`,
                    createdAt: new Date().toISOString(),
                    createdBy: currentAgent,
                  })
                }
                toast.success(alsoUpdateSpouse && spouse ? "Address updated on both profiles" : "Address updated")
                setEditingAddressId(null)
                setEditingAddressDraft(null)
              }}
              className="grid gap-4 py-2"
            >
              <AddressForm
                address={editingAddressDraft}
                onChange={(patch) =>
                  setEditingAddressDraft((prev) =>
                    prev ? { ...prev, ...patch } : null
                  )
                }
                showType={true}
                showPreferred={(client.addresses?.length ?? 0) > 1}
                allowManualEntry={true}
                dialogOpen={editingAddressId !== null}
              />
              {spouse && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-address-also-spouse"
                    checked={alsoUpdateSpouse}
                    onCheckedChange={(v) => setAlsoUpdateSpouse(v === true)}
                  />
                  <label htmlFor="edit-address-also-spouse" className="text-sm cursor-pointer">Also update spouse</label>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingAddressId(null)
                    setEditingAddressDraft(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Tasks */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/10">
              <Calendar className="h-4 w-4 text-chart-4" />
            </div>
            Tasks
          </CardTitle>
          {pendingTasks.length > 0 && (
            <Badge className="border-chart-4/25 bg-chart-4/10 text-chart-4 font-semibold" variant="outline">
              {pendingTasks.length} pending
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Calendar className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No tasks yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a task from the header above to follow up with this client.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingTasks.map((task) => (
                <div key={task.id} className="py-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-lg"
                      onClick={() => completeTask(task.id)}
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-chart-4">
                        <Clock className="h-3 w-3 text-chart-4" />
                      </div>
                      <span className="sr-only">Complete task</span>
                    </Button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(task.dueDate), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      {task.description?.trim() && (
                        <Collapsible defaultOpen={false} className="group mt-1.5">
                          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                            Description
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-4 ml-0.5">
                              {task.description}
                            </p>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {completedTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="py-3 opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground line-through">{task.title}</p>
                      {task.description?.trim() && (
                        <Collapsible defaultOpen={false} className="group mt-1.5">
                          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                            Description
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-4 ml-0.5 line-through">
                              {task.description}
                            </p>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Activity Summary */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
              <StickyNote className="h-4 w-4 text-chart-2" />
            </div>
            Recent activity
          </CardTitle>
          {sortedActivities.length > QUICK_ACTIVITY_LIMIT && (sectionBasePath || onNavigateToSection) && (
            sectionBasePath ? (
              <Button variant="ghost" size="sm" className="text-xs" asChild>
                <Link href={`${sectionBasePath}?section=notes`} scroll={false} className="inline-flex items-center">
                  View all
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => onNavigateToSection!("notes")}
              >
                View all
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )
          )}
        </CardHeader>
        <CardContent className="p-6">
          {quickActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <StickyNote className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No activity recorded</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a note or log a call in Notes & Activity.
              </p>
              {(sectionBasePath || onNavigateToSection) && (
                sectionBasePath ? (
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href={`${sectionBasePath}?section=notes`} scroll={false}>
                      Go to Notes & Activity
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => onNavigateToSection!("notes")}
                  >
                    Go to Notes & Activity
                  </Button>
                )
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {quickActivities.map((activity) => {
                const displayType = getActivityDisplayType(activity)
                const Icon = activityIcons[displayType]
                const colorClass = activityColors[displayType]
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{activity.description}</p>
                      {activity.outcome && (
                        <p className="text-xs text-muted-foreground">
                          Outcome: {activity.outcome}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activity.createdBy ?? "Note"} · {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                )
              })}
              {sortedActivities.length > QUICK_ACTIVITY_LIMIT && (sectionBasePath || onNavigateToSection) && (
                sectionBasePath ? (
                  <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                    <Link href={`${sectionBasePath}?section=notes`} scroll={false} className="inline-flex items-center">
                      View all {sortedActivities.length} in Notes & Activity
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onNavigateToSection!("notes")}
                  >
                    View all {sortedActivities.length} in Notes & Activity
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
