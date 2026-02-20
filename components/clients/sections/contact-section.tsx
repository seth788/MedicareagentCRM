"use client"

import { useState, useEffect } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { parseLocalDate, getAgeFromDob } from "@/lib/date-utils"
import {
  User,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Calendar,
  StickyNote,
  CheckCircle2,
  Clock,
  ChevronRight,
  Globe,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCRMStore } from "@/lib/store"
import type { ActivityType } from "@/lib/types"
import type { SectionProps } from "./types"

const activityIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  email: Mail,
  text: MessageSquare,
  appointment: Calendar,
  note: StickyNote,
}

const activityColors: Record<ActivityType, string> = {
  call: "bg-chart-1/10 text-chart-1",
  email: "bg-chart-2/10 text-chart-2",
  text: "bg-chart-3/10 text-chart-3",
  appointment: "bg-chart-4/10 text-chart-4",
  note: "bg-muted text-muted-foreground",
}

const QUICK_ACTIVITY_LIMIT = 5

export function ContactSection({
  client,
  activities,
  tasks,
  onNavigateToSection,
}: SectionProps) {
  const [mounted, setMounted] = useState(false)
  const { completeTask } = useCRMStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const age = mounted ? getAgeFromDob(client.dob) : 0
  const pendingTasks = tasks.filter((t) => !t.completedAt)
  const completedTasks = tasks.filter((t) => t.completedAt)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const quickActivities = sortedActivities.slice(0, QUICK_ACTIVITY_LIMIT)

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Personal Info */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            Personal details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="text-sm text-muted-foreground">Full name</span>
              <span className="text-sm font-medium text-foreground">
                {client.firstName} {client.lastName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="text-sm text-muted-foreground">Date of birth</span>
              <span className="text-sm text-foreground">
                {format(parseLocalDate(client.dob), "MMMM d, yyyy")}
                {mounted && (
                  <Badge variant="secondary" className="ml-2 text-xs">Age {age}</Badge>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                Language
              </span>
              <span className="text-sm text-foreground">{client.language}</span>
            </div>
            {client.householdMembers && client.householdMembers.length > 0 && (
              <div className="flex items-center justify-between gap-4 px-6 py-3.5">
                <span className="text-sm text-muted-foreground">Household</span>
                <span className="text-right text-sm text-foreground">
                  {client.householdMembers.join(", ")}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            Contact information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                Phone
              </span>
              <a href={`tel:${client.phone}`} className="text-sm font-medium text-primary hover:underline">
                {client.phone}
              </a>
            </div>
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Email
              </span>
              <a href={`mailto:${client.email}`} className="text-sm font-medium text-primary hover:underline">
                {client.email}
              </a>
            </div>
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Address
              </span>
              <span className="text-right text-sm text-foreground">
                {client.address}, {client.city}, {client.state} {client.zip}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 px-6 py-3.5">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Preferred
              </span>
              <Badge variant="outline" className="capitalize font-medium">
                {client.preferredContactMethod}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/10">
              <Calendar className="h-4 w-4 text-chart-4" />
            </div>
            Tasks
          </CardTitle>
          {pendingTasks.length > 0 && (
            <Badge className="border-chart-4/25 bg-chart-4/10 text-chart-4 font-semibold" variant="outline">
              {pendingTasks.length} pending
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Calendar className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No tasks yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a task from the header above to follow up with this client.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg"
                    onClick={() => completeTask(task.id)}
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-chart-4">
                      <Clock className="h-3 w-3 text-chart-4" />
                    </div>
                    <span className="sr-only">Complete task</span>
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {format(parseLocalDate(task.dueDate), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
              {completedTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-3 opacity-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground line-through">{task.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Activity Summary */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
              <StickyNote className="h-4 w-4 text-chart-2" />
            </div>
            Recent activity
          </CardTitle>
          {sortedActivities.length > QUICK_ACTIVITY_LIMIT && onNavigateToSection && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => onNavigateToSection("notes")}
            >
              View all
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {quickActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <StickyNote className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No activity recorded</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a note or log a call in Notes & Activity.
              </p>
              {onNavigateToSection && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => onNavigateToSection("notes")}
                >
                  Go to Notes & Activity
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {quickActivities.map((activity) => {
                const Icon = activityIcons[activity.type]
                const colorClass = activityColors[activity.type]
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{activity.description}</p>
                      {activity.outcome && (
                        <p className="text-xs text-muted-foreground">
                          Outcome: {activity.outcome}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activity.createdBy} ·{" "}
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
              {sortedActivities.length > QUICK_ACTIVITY_LIMIT && onNavigateToSection && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onNavigateToSection("notes")}
                >
                  View all {sortedActivities.length} in Notes & Activity
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
