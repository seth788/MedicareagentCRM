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
} from "lucide-react"
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
import type { Client } from "@/lib/types"

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
  const { leads, deleteLead, addActivity, flows, activities, tasks } = useCRMStore()
  const [mounted, setMounted] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [markAsLeadOpen, setMarkAsLeadOpen] = useState(false)
  const [removeLeadOpen, setRemoveLeadOpen] = useState(false)

  const leadForClient = leads.find((l) => l.clientId === client.id)

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

  const handleRemoveFromLeads = () => {
    if (leadForClient) {
      const flow = flows.find((f) => f.id === leadForClient.flowId)
      const flowName = flow?.name ?? "flow"
      const now = new Date().toISOString()
      addActivity({
        id: `act-${Date.now()}`,
        relatedType: "Client",
        relatedId: client.id,
        type: "note",
        description: `Removed from ${flowName}`,
        createdAt: now,
        createdBy: "Sarah Mitchell",
      })
      deleteLead(leadForClient.id)
      goeyToast.success("Removed from flow", {
        description: `${client.firstName} ${client.lastName} is no longer in ${flowName}`,
      })
      setRemoveLeadOpen(false)
    }
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
              <Button size="sm" variant="outline" className="bg-card/80 backdrop-blur-sm" onClick={() => onRequestEdit()}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button size="sm" className="shadow-sm" onClick={() => setCreateTaskOpen(true)}>
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                Task
              </Button>
              {leadForClient ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-card/80 backdrop-blur-sm"
                  onClick={() => setRemoveLeadOpen(true)}
                  aria-label="Remove from leads pipeline"
                >
                  <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Remove from leads</span>
                  <span className="sm:hidden">Remove</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-card/80 backdrop-blur-sm"
                  onClick={() => setMarkAsLeadOpen(true)}
                  aria-label="Mark as lead"
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark as lead</span>
                  <span className="sm:hidden">Lead</span>
                </Button>
              )}
            </div>
          </div>

          {/* Name and badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {client.firstName} {client.lastName}
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
            {leadForClient && (
              <Badge className="border-chart-2/25 bg-chart-2/10 text-chart-2 font-medium" variant="outline">
                Active Lead
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={`tel:${client.phone}`}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-primary/70" />
                      {client.phone}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Call {client.firstName}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={`mailto:${client.email}`}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-primary/70" />
                      {client.email}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Email {client.firstName}</TooltipContent>
                </Tooltip>
                <span className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                  {client.city}, {client.state} {client.zip}
                </span>
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

      <AlertDialog open={removeLeadOpen} onOpenChange={setRemoveLeadOpen}>
        <AlertDialogContent aria-describedby="remove-lead-description">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from leads?</AlertDialogTitle>
            <AlertDialogDescription id="remove-lead-description">
              This will remove {client.firstName} {client.lastName} from the leads pipeline. They
              will remain a client; you can add them back to leads anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFromLeads}>
              Remove from leads
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
