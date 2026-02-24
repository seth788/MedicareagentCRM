"use client"

import { useState } from "react"
import { format, differenceInDays } from "date-fns"
import { parseLocalDate, getT65FromDob } from "@/lib/date-utils"
import { Phone, Plus, Cake, Info } from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCRMStore } from "@/lib/store"
import { getPreferredOrFirstPhone } from "@/lib/utils"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function Turning65Widget() {
  const { clients } = useCRMStore()
  const [taskDialogClient, setTaskDialogClient] = useState<{
    id: string
    firstName: string
    lastName: string
    dob: string
  } | null>(null)

  const now = new Date()
  const upcoming = clients
    .filter((c) => {
      const t65 = getT65FromDob(c.dob)
      const t = parseLocalDate(t65)
      return t >= now
    })
    .sort((a, b) => parseLocalDate(getT65FromDob(a.dob)).getTime() - parseLocalDate(getT65FromDob(b.dob)).getTime())
    .slice(0, 10)

  return (
    <TooltipProvider delayDuration={300}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cake className="h-4 w-4 text-primary" />
              Turning 65 Soon
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  <Info className="h-3.5 w-3.5" />
                  <span className="sr-only">About this widget</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                <p className="text-xs leading-relaxed">
                  Clients approaching their 65th birthday who become eligible for Medicare. Use the action buttons to call or create a follow-up task.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="secondary" className="text-xs">
            {upcoming.length} upcoming
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No clients turning 65 soon</p>
            </div>
          ) : (
            <div className="divide-y">
              {upcoming.map((client) => {
                const t65 = getT65FromDob(client.dob)
                const days = differenceInDays(parseLocalDate(t65), now)
                return (
                  <div
                    key={client.id}
                    className="flex min-h-[40px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {client.firstName} {client.lastName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {format(parseLocalDate(t65), "MMM d, yyyy")}
                        <span className="ml-1.5 font-medium text-primary">
                          ({days}d away)
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="min-h-[40px] min-w-[40px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0" asChild>
                            <a href={`tel:${getPreferredOrFirstPhone(client)?.number ?? ""}`}>
                              <Phone className="h-3.5 w-3.5" />
                              <span className="sr-only">Call {client.firstName}</span>
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Call {client.firstName}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-[40px] min-w-[40px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
                            onClick={() => setTaskDialogClient(client)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="sr-only">Create task for {client.firstName}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Create outreach task</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {taskDialogClient && (
        <CreateTaskDialog
          open={!!taskDialogClient}
          onOpenChange={(open) => !open && setTaskDialogClient(null)}
          relatedType="Client"
          relatedId={taskDialogClient.id}
          relatedName={`${taskDialogClient.firstName} ${taskDialogClient.lastName}`}
          defaultTitle={`T65 outreach - ${taskDialogClient.firstName} ${taskDialogClient.lastName}`}
          defaultDescription={`Turning 65 on ${format(parseLocalDate(getT65FromDob(taskDialogClient.dob)), "MMM d, yyyy")}`}
        />
      )}
    </TooltipProvider>
  )
}
