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
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Personal Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <User className="h-5 w-5 text-primary" />
            Personal details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-right text-sm font-medium text-foreground">
              {client.firstName} {client.lastName}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">Date of birth</span>
            <span className="text-right text-sm text-foreground">
              {format(parseLocalDate(client.dob), "MMMM d, yyyy")}
              {mounted && (
                <span className="ml-1 text-muted-foreground">(Age {age})</span>
              )}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">Preferred language</span>
            <span className="text-right text-sm text-foreground">{client.language}</span>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Phone className="h-5 w-5 text-primary" />
            Contact information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">Phone</span>
            <span className="text-right text-sm text-foreground">{client.phone}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-right text-sm text-foreground">{client.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">Address</span>
            <span className="text-right text-sm text-foreground">
              {client.address}, {client.city}, {client.state} {client.zip}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">Preferred contact</span>
            <span className="capitalize text-sm text-foreground">
              {client.preferredContactMethod}
            </span>
          </div>
          {client.householdMembers && client.householdMembers.length > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-sm text-muted-foreground">Household</span>
              <span className="text-right text-sm text-foreground">
                {client.householdMembers.join(", ")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Calendar className="h-5 w-5 text-primary" />
            Tasks
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {pendingTasks.length} pending
          </Badge>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No tasks</p>
              <p className="text-xs text-muted-foreground">
                Create a task from the profile header to follow up with this client.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => completeTask(task.id)}
                  >
                    <Clock className="h-4 w-4 text-warning" />
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
                  className="flex items-center gap-3 py-3 opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <StickyNote className="h-5 w-5 text-primary" />
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
        <CardContent className="p-6 pt-0">
          {quickActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <StickyNote className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No activity recorded</p>
              <p className="text-xs text-muted-foreground">
                Add a note or log a call in Notes &amp; Activity.
              </p>
              {onNavigateToSection && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => onNavigateToSection("notes")}
                >
                  Go to Notes &amp; Activity
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {quickActivities.map((activity) => {
                const Icon = activityIcons[activity.type]
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 py-3 first:pt-0"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{activity.description}</p>
                      {activity.outcome && (
                        <p className="text-xs text-muted-foreground">
                          Outcome: {activity.outcome}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
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
                <div className="pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onNavigateToSection("notes")}
                  >
                    View all {sortedActivities.length} in Notes &amp; Activity
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
