"use client"

import { useState, useEffect } from "react"
import { format, differenceInDays, formatDistanceToNow } from "date-fns"
import { parseLocalDate, getT65FromDob, getAgeFromDob } from "@/lib/date-utils"
import { MapPin, Mail, Phone, Calendar, UserPlus, UserMinus, Pencil } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { MarkAsLeadDialog } from "@/components/clients/mark-as-lead-dialog"
import { EditClientDialog } from "./edit-client-dialog"
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

export function ClientProfileHeader({ client }: { client: Client }) {
  const { leads, deleteLead, addActivity, flows } = useCRMStore()
  const [mounted, setMounted] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [markAsLeadOpen, setMarkAsLeadOpen] = useState(false)
  const [editClientOpen, setEditClientOpen] = useState(false)
  const [removeLeadOpen, setRemoveLeadOpen] = useState(false)

  const leadForClient = leads.find((l) => l.clientId === client.id)

  useEffect(() => {
    setMounted(true)
  }, [])

  const t65Date = getT65FromDob(client.dob)
  const age = mounted ? getAgeFromDob(client.dob) : 0
  const days = mounted ? differenceInDays(parseLocalDate(t65Date), new Date()) : 0
  const isFuture = days >= 0

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
      <Card>
        <CardContent className="p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                {client.firstName[0]}
                {client.lastName[0]}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    {client.firstName} {client.lastName}
                  </h2>
                  {mounted && (isFuture ? (
                    <Badge className="bg-primary/15 text-primary border-primary/20" variant="outline">
                      T65 in {days}d
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Age {age}
                    </Badge>
                  ))}
                  {client.coverage && (
                    <Badge variant="secondary" className="text-xs">
                      {client.coverage.carrier} {client.coverage.planType}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  DOB: {format(parseLocalDate(client.dob), "MMMM d, yyyy")} &middot;
                  {age >= 65 ? (
                    <>Age {age}</>
                  ) : (
                    <>T65: {format(parseLocalDate(t65Date), "MMMM d, yyyy")}</>
                  )}
                </p>
                {mounted && client.updatedAt && (
                  <p className="mt-0.5 text-xs text-muted-foreground" aria-live="polite">
                    Updated {formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true })}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {client.phone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {client.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {client.city}, {client.state} {client.zip}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditClientOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit profile
              </Button>
              <Button size="sm" onClick={() => setCreateTaskOpen(true)}>
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                Task
              </Button>
              {leadForClient ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRemoveLeadOpen(true)}
                  aria-label="Remove from leads pipeline"
                >
                  <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                  Remove from leads
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMarkAsLeadOpen(true)}
                  aria-label="Mark as lead"
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Mark as lead
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
