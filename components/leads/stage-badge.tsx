import { Badge } from "@/components/ui/badge"

const colorKeyToClass: Record<string, string> = {
  primary: "bg-primary/15 text-primary border-primary/20",
  "chart-2": "bg-chart-2/15 text-chart-2 border-chart-2/20",
  "chart-3": "bg-chart-3/15 text-chart-3 border-chart-3/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  "chart-4": "bg-chart-4/15 text-chart-4 border-chart-4/20",
  success: "bg-success/15 text-success border-success/20",
  muted: "bg-muted text-muted-foreground border-muted",
}

function isHexColor(value: string | undefined): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)
}

export interface StageBadgeProps {
  /** Display name of the stage */
  name: string
  /** Optional theme key or hex color (e.g. #3b82f6) for badge color */
  colorKey?: string
  /** Optional extra class names (e.g. pointer-events-none in menus) */
  className?: string
}

export function StageBadge({ name, colorKey, className: extraClass }: StageBadgeProps) {
  const baseClass = "text-[11px] font-medium border"
  if (isHexColor(colorKey)) {
    return (
      <Badge
        variant="outline"
        className={extraClass ? `${baseClass} ${extraClass}` : baseClass}
        style={{
          backgroundColor: `${colorKey}20`,
          color: colorKey,
          borderColor: `${colorKey}40`,
        }}
      >
        {name}
      </Badge>
    )
  }
  const colorClass = colorKey ? colorKeyToClass[colorKey] ?? colorKeyToClass.muted : colorKeyToClass.muted
  return (
    <Badge variant="outline" className={`${baseClass} ${colorClass}${extraClass ? ` ${extraClass}` : ""}`}>
      {name}
    </Badge>
  )
}
