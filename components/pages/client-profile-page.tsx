"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { ClientProfileHeader } from "@/components/clients/profile-header"
import { ClientTabs } from "@/components/clients/client-tabs"
import { useCRMStore } from "@/lib/store"

export default function ClientProfilePageInner({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { clients, activities, tasks } = useCRMStore()
  const client = clients.find((c) => c.id === id)

  if (!client) {
    return notFound()
  }

  const clientActivities = activities.filter(
    (a) => a.relatedId === client.id && a.relatedType === "Client"
  )
  const clientTasks = tasks.filter(
    (t) => t.relatedId === client.id && t.relatedType === "Client"
  )

  const openCmd = () => {
    const fn = (window as unknown as Record<string, unknown>).__openCommandPalette
    if (typeof fn === "function") (fn as () => void)()
  }

  return (
    <>
      <AppHeader
        title={`${client.firstName} ${client.lastName}`}
        onOpenCommandPalette={openCmd}
      />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6">
          <ClientProfileHeader client={client} />
          <div className="mt-6">
            <ClientTabs
              client={client}
              activities={clientActivities}
              tasks={clientTasks}
            />
          </div>
        </div>
      </div>
    </>
  )
}
