"use client"

import { useState, useMemo } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import { MoreHorizontal, ArrowUpDown, Trash2, Eye, ArrowRightLeft } from "@/components/icons"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { StageBadge } from "./stage-badge"
import { LeadDetailSheet } from "./lead-detail-sheet"
import { getLeadLastTouchedAt, lastTouchedColorClass } from "@/lib/lead-utils"
import type { Lead, Stage } from "@/lib/types"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"

type SortField = "name" | "source" | "stage" | "createdAt" | "lastTouchedAt"
type SortDir = "asc" | "desc"

interface TableViewProps {
  leads: Lead[]
  stages: Stage[]
}


export function TableView({ leads, stages }: TableViewProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [detailLead, setDetailLead] = useState<Lead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null)
  const { updateLeadStage, deleteLead, addActivity, flows, currentAgent, clients, activities, tasks } = useCRMStore()
  const lastTouchedContext = useMemo(
    () => ({ clients, activities, tasks }),
    [clients, activities, tasks]
  )

  const getStage = (stageId: string) => stages.find((s) => s.id === stageId)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const sorted = [...leads].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    const aTouched = getLeadLastTouchedAt(a, lastTouchedContext) ?? a.createdAt
    const bTouched = getLeadLastTouchedAt(b, lastTouchedContext) ?? b.createdAt
    switch (sortField) {
      case "name":
        return dir * `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
      case "source":
        return dir * a.source.localeCompare(b.source)
      case "stage": {
        const ai = stages.findIndex((s) => s.id === a.stageId)
        const bi = stages.findIndex((s) => s.id === b.stageId)
        return dir * (ai - bi)
      }
      case "createdAt":
        return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case "lastTouchedAt":
        return dir * (new Date(aTouched).getTime() - new Date(bTouched).getTime())
      default:
        return 0
    }
  })

  const toggleAll = () => {
    if (selected.size === sorted.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sorted.map((l) => l.id)))
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleBulkStage = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    const stageName = stage?.name ?? stageId
    const flowId = leads[0]?.flowId
    const flow = flowId ? flows.find((f) => f.id === flowId) : undefined
    const flowName = flow?.name ?? flowId ?? ""
    const now = new Date().toISOString()
    selected.forEach((id) => {
      updateLeadStage(id, stageId)
      const lead = leads.find((l) => l.id === id)
      if (lead) {
        if (lead.clientId) {
          addActivity({
            id: `act-${Date.now()}-${id}`,
            relatedType: "Client",
            relatedId: lead.clientId,
            type: "note",
            description: `Moved to ${stageName} in ${flowName}`,
            createdAt: now,
            createdBy: currentAgent,
          })
        } else {
          addActivity({
            id: `act-${Date.now()}-${id}`,
            relatedType: "Lead",
            relatedId: lead.id,
            type: "note",
            description: `Moved to ${stageName} in ${flowName}`,
            createdAt: now,
            createdBy: currentAgent,
          })
        }
      }
    })
    goeyToast.success(`Moved ${selected.size} leads to ${stage?.name ?? stageId}`)
    setSelected(new Set())
  }

  const handleDelete = () => {
    if (deleteTarget) {
      if (deleteTarget.clientId) {
        const flow = flows.find((f) => f.id === deleteTarget.flowId)
        const flowName = flow?.name ?? deleteTarget.flowId
        addActivity({
          id: `act-${Date.now()}`,
          relatedType: "Client",
          relatedId: deleteTarget.clientId,
          type: "note",
          description: `Removed from "${flowName}" Flow`,
          createdAt: new Date().toISOString(),
          createdBy: currentAgent,
        })
      }
      deleteLead(deleteTarget.id)
      goeyToast.success("Lead deleted")
      setDeleteTarget(null)
    }
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 text-xs font-medium"
      onClick={() => toggleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  )

  return (
    <>
      <div className="p-4 sm:p-6">
        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
            <span className="text-sm font-medium text-foreground">
              {selected.size} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="min-h-[40px]">
                  Change Stage
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {stages.map((s) => (
                  <DropdownMenuItem key={s.id} onClick={() => handleBulkStage(s.id)}>
                    <StageBadge name={s.name} colorKey={s.colorKey ?? "muted"} className="pointer-events-none" />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[40px]"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        )}

        <div className="min-w-0 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === sorted.length && sorted.length > 0}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead><SortButton field="name">Name</SortButton></TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead><SortButton field="source">Source</SortButton></TableHead>
                <TableHead><SortButton field="stage">Stage</SortButton></TableHead>
                <TableHead className="hidden lg:table-cell">Assigned</TableHead>
                <TableHead className="hidden md:table-cell">
                  <SortButton field="createdAt">Created</SortButton>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <SortButton field="lastTouchedAt">Last touched</SortButton>
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <p className="text-sm text-muted-foreground">No leads found</p>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => setDetailLead(lead)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(lead.id)}
                        onCheckedChange={() => toggleOne(lead.id)}
                        aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {lead.firstName} {lead.lastName}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {lead.phone}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {lead.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.source}</TableCell>
                    <TableCell className="align-middle">
                      {(() => {
                        const stage = getStage(lead.stageId)
                        return stage ? (
                          <StageBadge name={stage.name} colorKey={stage.colorKey ?? "muted"} />
                        ) : (
                          <span className="text-muted-foreground text-xs">{lead.stageId}</span>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {lead.assignedTo.split(" ")[0]}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {format(parseLocalDate(lead.createdAt), "MMM d")}
                    </TableCell>
                    <TableCell
                      className={`hidden md:table-cell ${lastTouchedColorClass(
                        getLeadLastTouchedAt(lead, lastTouchedContext) ?? lead.createdAt
                      )}`}
                    >
                      {formatDistanceToNow(
                        new Date(getLeadLastTouchedAt(lead, lastTouchedContext) ?? lead.updatedAt),
                        { addSuffix: true }
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="min-h-[40px] min-w-[40px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailLead(lead)}>
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <ArrowRightLeft className="mr-2 h-3.5 w-3.5" />
                              Move to
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {stages.map((s) => (
                                <DropdownMenuItem
                                  key={s.id}
                                  onClick={() => {
                                    updateLeadStage(lead.id, s.id)
                                    const flow = flows.find((f) => f.id === lead.flowId)
                                    const flowName = flow?.name ?? lead.flowId
                                    if (lead.clientId) {
                                      addActivity({
                                        id: `act-${Date.now()}-${lead.id}`,
                                        relatedType: "Client",
                                        relatedId: lead.clientId,
                                        type: "note",
                                        description: `Moved to ${s.name} in ${flowName}`,
                                        createdAt: new Date().toISOString(),
                                        createdBy: currentAgent,
                                      })
                                    } else {
                                      addActivity({
                                        id: `act-${Date.now()}-${lead.id}`,
                                        relatedType: "Lead",
                                        relatedId: lead.id,
                                        type: "note",
                                        description: `Moved to ${s.name} in ${flowName}`,
                                        createdAt: new Date().toISOString(),
                                        createdBy: currentAgent,
                                      })
                                    }
                                    goeyToast.success(`Moved to ${s.name}`)
                                  }}
                                >
                                  <StageBadge name={s.name} colorKey={s.colorKey ?? "muted"} className="pointer-events-none" />
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(lead)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <LeadDetailSheet
        lead={detailLead}
        open={!!detailLead}
        onOpenChange={(open) => {
          if (!open) setDetailLead(null)
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.firstName} {deleteTarget?.lastName}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
