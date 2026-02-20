"use client"

import { BarChart3, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCRMStore } from "@/lib/store"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const colorKeyToHsl: Record<string, string> = {
  primary: "hsl(210, 75%, 42%)",
  "chart-2": "hsl(168, 60%, 40%)",
  "chart-3": "hsl(24, 80%, 55%)",
  warning: "hsl(38, 92%, 50%)",
  "chart-4": "hsl(45, 85%, 55%)",
  success: "hsl(158, 60%, 42%)",
  muted: "hsl(215, 12%, 50%)",
}

function getStageFillColor(colorKey: string | undefined): string {
  if (typeof colorKey === "string" && /^#[0-9A-Fa-f]{6}$/.test(colorKey)) return colorKey
  return colorKeyToHsl[colorKey ?? "muted"] ?? colorKeyToHsl.muted
}

export function PipelineChart() {
  const { leads, getDefaultFlow, getStagesByFlowId } = useCRMStore()
  const defaultFlow = getDefaultFlow()
  const stages = defaultFlow ? getStagesByFlowId(defaultFlow.id) : []

  const data = stages.map((stage) => ({
    stage: stage.name,
    stageId: stage.id,
    colorKey: stage.colorKey ?? "muted",
    count: leads.filter((l) => l.flowId === defaultFlow?.id && l.stageId === stage.id).length,
  }))

  return (
    <TooltipProvider delayDuration={300}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              {defaultFlow ? `${defaultFlow.name} Pipeline` : "Lead Pipeline"}
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  <Info className="h-3.5 w-3.5" />
                  <span className="sr-only">About this chart</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                <p className="text-xs leading-relaxed">
                  Visual breakdown of leads by pipeline stage for the default flow. Each bar shows how many leads are currently in that stage. A healthy pipeline typically narrows from left to right.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            {data.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No stages to display. Add a flow and stages in Flows.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {data.map((entry) => (
                      <Cell key={entry.stageId} fill={getStageFillColor(entry.colorKey)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
