"use client"

import { formatDistanceToNow } from "date-fns"
import { UserPlus, Info } from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCRMStore } from "@/lib/store"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StageBadge } from "@/components/leads/stage-badge"

export function RecentLeadsWidget() {
  const { leads, getStageById } = useCRMStore()

  const recent = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  return (
    <TooltipProvider delayDuration={300}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <UserPlus className="h-4 w-4 text-primary" />
              Recent Leads
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  <Info className="h-3.5 w-3.5" />
                  <span className="sr-only">About this widget</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                <p className="text-xs leading-relaxed">
                  Your 10 most recently added leads sorted by creation date. Click a stage badge to learn what it means.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="secondary" className="text-xs">
            {leads.length} total
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No leads yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {recent.map((lead) => (
                <div
                  key={lead.id}
                  className="flex min-h-[40px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lead.source} &middot;{" "}
                      {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="shrink-0 cursor-default">
                        {(() => {
                          const stage = getStageById(lead.stageId)
                          return stage ? (
                            <StageBadge name={stage.name} colorKey={stage.colorKey} />
                          ) : (
                            <span className="text-xs text-muted-foreground">{lead.stageId}</span>
                          )
                        })()}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Stage: {getStageById(lead.stageId)?.name ?? lead.stageId}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
