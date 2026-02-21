"use client"

import { Users, UserPlus, CalendarClock, AlertTriangle, Info } from "@/components/icons"
import { parseLocalDate, getT65FromDob } from "@/lib/date-utils"
import { Card, CardContent } from "@/components/ui/card"
import { useCRMStore } from "@/lib/store"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function KPICards() {
  const { clients, leads, tasks, getStagesByFlowId } = useCRMStore()

  const now = new Date()
  const in30 = new Date(now)
  in30.setDate(in30.getDate() + 30)
  const in60 = new Date(now)
  in60.setDate(in60.getDate() + 60)
  const in90 = new Date(now)
  in90.setDate(in90.getDate() + 90)

  const turning65In30 = clients.filter((c) => {
    const t = parseLocalDate(getT65FromDob(c.dob))
    return t >= now && t <= in30
  }).length

  const turning65In90 = clients.filter((c) => {
    const t = parseLocalDate(getT65FromDob(c.dob))
    return t >= now && t <= in90
  }).length

  const activeLeads = leads.filter((l) => {
    const flowStages = getStagesByFlowId(l.flowId)
    const earlyStageIds = flowStages.slice(0, 3).map((s) => s.id)
    return earlyStageIds.includes(l.stageId)
  }).length

  const tasksDueToday = tasks.filter((t) => {
    if (t.completedAt) return false
    const due = new Date(t.dueDate)
    return due.toDateString() === now.toDateString()
  }).length

  const overdueTasks = tasks.filter((t) => {
    if (t.completedAt) return false
    return new Date(t.dueDate) < now && new Date(t.dueDate).toDateString() !== now.toDateString()
  }).length

  const kpis = [
    {
      label: "Turning 65 Soon",
      value: turning65In30,
      subtitle: `${turning65In90} within 90 days`,
      icon: CalendarClock,
      color: "text-primary" as const,
      bgColor: "bg-primary/10" as const,
      tooltip: "Clients turning 65 within the next 30 days who become eligible for Medicare enrollment.",
    },
    {
      label: "Active Clients",
      value: clients.length,
      subtitle: "Total enrolled",
      icon: Users,
      color: "text-success" as const,
      bgColor: "bg-success/10" as const,
      tooltip: "Total clients in your book of business who are currently enrolled in a plan.",
    },
    {
      label: "Active Leads",
      value: activeLeads,
      subtitle: "New + Contacted + Scheduled",
      icon: UserPlus,
      color: "text-chart-3" as const,
      bgColor: "bg-chart-3/10" as const,
      tooltip: "Prospects in the early stages of your pipeline: New, Contacted, or Scheduled for an appointment.",
    },
    {
      label: "Tasks Due",
      value: tasksDueToday,
      subtitle: overdueTasks > 0 ? `${overdueTasks} overdue` : "All on track",
      icon: AlertTriangle,
      color: overdueTasks > 0 ? ("text-destructive" as const) : ("text-warning" as const),
      bgColor: overdueTasks > 0 ? ("bg-destructive/10" as const) : ("bg-warning/10" as const),
      tooltip: "Tasks due today. Overdue tasks are highlighted in red and need immediate attention.",
    },
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="relative overflow-hidden">
            <CardContent className="flex items-start gap-4 p-5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                        <Info className="h-3.5 w-3.5" />
                        <span className="sr-only">More info about {kpi.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px]">
                      <p className="text-xs leading-relaxed">{kpi.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  )
}
