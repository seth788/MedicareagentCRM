"use client"

import { useState, useEffect } from "react"
import { format, differenceInDays, formatDistanceToNow } from "date-fns"
import { parseLocalDate, getT65FromDob, getAgeFromDob } from "@/lib/date-utils"
import {
  MapPin,
  Mail,
  Phone,
  Calendar,
  UserPlus,
  UserMinus,
  Pencil,
  Clock,
  Heart,
  Shield,
  MessageSquare,
} from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCRMStore } from "@/lib/store"
import { getPreferredOrFirstAddress, getPreferredOrFirstPhone, getPreferredOrFirstEmail } from "@/lib/utils"
import { goeyToast } from "goey-toast"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { MarkAsLeadDialog } from "@/components/clients/mark-as-lead-dialog"
import { EditClientDialog, type EditClientSection } from "./edit-client-dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "@/components/icons"
import type { Client, Lead } from "@/lib/types"

interface ClientProfileHeaderProps {
  client: Client
  editClientOpen: boolean
  onEditClientOpenChange: (open: boolean) => void
  editClientSection: EditClientSection | null
  onRequestEdit: (section?: EditClientSection | null) => void
}

export function ClientProfileHeader({
  client,
  editClientOpen,
  onEditClientOpenChange: setEditClientOpen,
  editClientSection,
  onRequestEdit,
}: ClientProfileHeaderProps) {
  const { leads, deleteLead, addActivity, flows, activities, tasks, currentAgent } = useCRMStore()
  const [mounted, setMounted] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [markAsLeadOpen, setMarkAsLeadOpen] = useState(false)
  const [removeLeadOpen, setRemoveLeadOpen] = useState(false)
  const [removeLeadTarget, setRemoveLeadTarget] = useState<Lead | null>(null)

  const leadsForClient = leads.filter((l) => l.clientId === client.id)
  const canAddToFlow = flows.some((f) => !leadsForClient.some((l) => l.flowId === f.id))

  useEffect(() => {
    setMounted(true)
  }, [])

  const t65Date = getT65FromDob(client.dob)
  const age = mounted ? getAgeFromDob(client.dob) : 0
  const days = mounted ? differenceInDays(parseLocalDate(t65Date), new Date()) : 0
  const isFuture = days >= 0

  const clientActivities = activities.filter(
    (a) => a.relatedId === client.id && a.relatedType === "Client"
  )
  const clientTasks = tasks.filter(
    (t) => t.relatedId === client.id && t.relatedType === "Client"
  )
  const pendingTasks = clientTasks.filter((t) => !t.completedAt)

  const handleRemoveFromLead = (leadToRemove: Lead) => {
    const flow = flows.find((f) => f.id === leadToRemove.flowId)
    const flowName = flow?.name ?? "flow"
    const now = new Date().toISOString()
    addActivity({
      id: `act-${Date.now()}`,
      relatedType: "Client",
      relatedId: client.id,
      type: "note",
      description: `Removed from "${flowName}" Flow`,
      createdAt: now,
      createdBy: currentAgent,
    })
    deleteLead(leadToRemove.id)
    goeyToast.success("Removed from flow", {
      description: `${client.firstName} ${client.lastName} is no longer in ${flowName}`,
    })
    setRemoveLeadOpen(false)
    setRemoveLeadTarget(null)
  }

  const openRemoveConfirm = (lead: Lead) => {
    setRemoveLeadTarget(lead)
    setRemoveLeadOpen(true)
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Colored banner */}
        <div className="relative h-28 bg-primary sm:h-32">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_25%,rgba(255,255,255,0.08)_50%,transparent_75%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>

        {/* Profile content overlapping the banner */}
        <div className="relative px-5 pb-6 sm:px-7">
          {/* Avatar - positioned to overlap the banner */}
          <div className="-mt-14 mb-4 flex items-end justify-between sm:-mt-16">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-card bg-primary text-2xl font-bold tracking-wide text-primary-foreground shadow-md sm:h-28 sm:w-28 sm:text-3xl">
              {client.firstName[0]}
              {client.lastName[0]}
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="bg-card/80 backdrop-blur-sm" aria-label="Actions">
                    Actions
                    <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => onRequestEdit()}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateTaskOpen(true)}>
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    Task
                  </DropdownMenuItem>
                  {canAddToFlow && (
                    <DropdownMenuItem onClick={() => setMarkAsLeadOpen(true)}>
                      <UserPlus className="mr-2 h-3.5 w-3.5" />
                      Add to flow
                    </DropdownMenuItem>
                  )}
                  {leadsForClient.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {leadsForClient.map((lead) => {
                        const flowName = flows.find((f) => f.id === lead.flowId)?.name ?? "flow"
                        return (
                          <DropdownMenuItem
                            key={lead.id}
                            onClick={() => openRemoveConfirm(lead)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinus className="mr-2 h-3.5 w-3.5" />
                            Remove from &quot;{flowName}&quot;
                          </DropdownMenuItem>
                        )
                      })}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Name and badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {client.nickname ? `${client.firstName} "${client.nickname}" ${client.lastName}` : `${client.firstName} ${client.lastName}`}
            </h2>
            {mounted && (isFuture ? (
              <Badge className="border-primary/25 bg-primary/10 text-primary font-semibold" variant="outline">
                T65 in {days}d
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-medium">
                Age {age}
              </Badge>
            ))}
            {client.coverage && (
              <Badge variant="secondary" className="text-xs font-medium">
                {client.coverage.carrier} {client.coverage.planType}
              </Badge>
            )}
            {leadsForClient.length > 0 && (
              <Badge className="border-chart-2/25 bg-chart-2/10 text-chart-2 font-medium" variant="outline">
                {leadsForClient.length === 1 ? "Active Lead" : `In ${leadsForClient.length} flows`}
              </Badge>
            )}
          </div>

          {/* Key details row */}
          <p className="mt-1.5 text-sm text-muted-foreground">
            DOB: {format(parseLocalDate(client.dob), "MMMM d, yyyy")} &middot;{" "}
            {age >= 65 ? (
              <>Age {age}</>
            ) : (
              <>T65: {format(parseLocalDate(t65Date), "MMMM d, yyyy")}</>
            )}
          </p>
          {mounted && client.updatedAt && (
            <p className="mt-0.5 text-xs text-muted-foreground" aria-live="polite">
              Last updated {formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true })}
            </p>
          )}

          <Separator className="my-5" />

          {/* Contact details + quick stats */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            {/* Contact info */}
            <TooltipProvider delayDuration={300}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
                {(() => {
                  const phone = getPreferredOrFirstPhone(client)
                  if (!phone?.number) return null
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`tel:${phone.number}`}
                          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Phone className="h-4 w-4 shrink-0 text-primary/70" />
                          {phone.number}
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>Call {client.firstName}</TooltipContent>
                    </Tooltip>
                  )
                })()}
                {(() => {
                  const email = getPreferredOrFirstEmail(client)
                  if (!email?.value) return null
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`mailto:${email.value}`}
                          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Mail className="h-4 w-4 shrink-0 text-primary/70" />
                          {email.value}
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>Email {client.firstName}</TooltipContent>
                    </Tooltip>
                  )
                })()}
                {(() => {
                  const addr = getPreferredOrFirstAddress(client)
                  if (!addr) return null
                  const location = [addr.city, addr.state, addr.zip].filter(Boolean).join(", ")
                  if (!location) return null
                  return (
                    <span className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                      {location}
                    </span>
                  )
                })()}
                <span className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4 shrink-0 text-primary/70" />
                  Prefers <span className="capitalize font-medium text-foreground">{client.preferredContactMethod}</span>
                </span>
              </div>
            </TooltipProvider>

            {/* Quick stat pills */}
            <div className="flex shrink-0 flex-wrap gap-2.5">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none">Tasks</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground leading-none">{pendingTasks.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-chart-2/10">
                  <Heart className="h-3.5 w-3.5 text-chart-2" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none">Conditions</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground leading-none">{client.conditions.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-chart-3/10">
                  <Shield className="h-3.5 w-3.5 text-chart-3" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-none">Coverage</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground leading-none">
                    {client.coverage ? client.coverage.planType : "None"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        relatedType="Client"
        relatedId={client.id}
        relatedName={`${client.firstName} ${client.lastName}`}
      />

      <MarkAsLeadDialog
        client={client}
        open={markAsLeadOpen}
        onOpenChange={setMarkAsLeadOpen}
      />

      <EditClientDialog
        client={client}
        open={editClientOpen}
        onOpenChange={setEditClientOpen}
        section={editClientSection}
      />

      <AlertDialog
        open={removeLeadOpen}
        onOpenChange={(open) => {
          if (!open) setRemoveLeadTarget(null)
          setRemoveLeadOpen(open)
        }}
      >
        <AlertDialogContent aria-describedby="remove-lead-description">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove from {removeLeadTarget ? flows.find((f) => f.id === removeLeadTarget.flowId)?.name ?? "flow" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription id="remove-lead-description">
              This will remove {client.firstName} {client.lastName} from this flow. They will remain
              a client and stay in any other flows; you can add them back to this flow anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeLeadTarget && handleRemoveFromLead(removeLeadTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove from flow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
