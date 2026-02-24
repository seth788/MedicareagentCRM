"use client"

import { useState } from "react"
import { UserPlus, Users, Plus } from "@/components/icons"
import { AppHeader } from "@/components/app-header"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { Turning65Widget } from "@/components/dashboard/turning-65-widget"
import { RecentLeadsWidget } from "@/components/dashboard/recent-leads-widget"
import { PipelineChart } from "@/components/dashboard/pipeline-chart"
import { NewLeadDialog } from "@/components/leads/new-lead-dialog"
import { NewClientDialog } from "@/components/clients/new-client-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function DashboardPageInner() {
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [newClientOpen, setNewClientOpen] = useState(false)

  const openCmd = () => {
    const fn = (window as unknown as Record<string, unknown>).__openCommandPalette
    if (typeof fn === "function") (fn as () => void)()
  }

  return (
    <>
      <AppHeader title="Dashboard" onOpenCommandPalette={openCmd} />
      <div className="flex-1 overflow-auto overflow-x-hidden">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="mb-1">
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">Today at a Glance</h2>
              <p className="text-sm text-muted-foreground">
                Overview of your pipeline, tasks, and upcoming milestones.
              </p>
            </div>

            <TooltipProvider delayDuration={300}>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[40px] gap-1.5"
                      onClick={() => setNewLeadOpen(true)}
                    >
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">New Lead</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add a prospect to your sales pipeline</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      className="min-h-[40px] gap-1.5"
                      onClick={() => setNewClientOpen(true)}
                    >
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">New Client</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add an enrolled client to your book</p>
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8">
                          <Plus className="h-4 w-4" />
                          <span className="sr-only">Quick add</span>
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quick add menu</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setNewLeadOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      New Lead
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setNewClientOpen(true)}>
                      <Users className="mr-2 h-4 w-4" />
                      New Client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipProvider>
          </div>

          <div className="mt-5">
            <KPICards />
          </div>

          <div className="mt-6 grid gap-4 sm:gap-6 lg:grid-cols-2">
            <Turning65Widget />
            <RecentLeadsWidget />
          </div>

          <div className="mt-6">
            <PipelineChart />
          </div>
        </div>
      </div>

      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
      <NewClientDialog open={newClientOpen} onOpenChange={setNewClientOpen} />
    </>
  )
}
