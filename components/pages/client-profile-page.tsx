"use client"

import { use, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { notFound, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "@/components/icons"
import { goeyToast } from "goey-toast"
import { AppHeader } from "@/components/app-header"
import { ClientProfileHeader } from "@/components/clients/profile-header"
import { ClientTabs } from "@/components/clients/client-tabs"
import type { EditClientSection } from "@/components/clients/edit-client-dialog"
import { useCRMStore } from "@/lib/store"

export default function ClientProfilePageInner({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { clients, activities, tasks } = useCRMStore()
  const client = clients.find((c) => c.id === id)
  const [editClientOpen, setEditClientOpen] = useState(false)
  const [editClientSection, setEditClientSection] = useState<EditClientSection | null>(null)
  const hasShownNewToast = useRef(false)

  useEffect(() => {
    if (searchParams.get("new") !== "1" || !client || hasShownNewToast.current) return
    hasShownNewToast.current = true
    goeyToast.info("You can complete setting up the profile")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("new")
    const qs = params.toString()
    router.replace(qs ? `/clients/${id}?${qs}` : `/clients/${id}`, { scroll: false })
  }, [searchParams, client, id, router])

  const openEditClient = (section?: EditClientSection | null) => {
    setEditClientSection(section ?? null)
    setEditClientOpen(true)
  }

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
        title={client.nickname ? `${client.firstName} "${client.nickname}" ${client.lastName}` : `${client.firstName} ${client.lastName}`}
        onOpenCommandPalette={openCmd}
        breadcrumb={
          <Link
            href="/clients"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to Clients
          </Link>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <ClientProfileHeader
            client={client}
            editClientOpen={editClientOpen}
            onEditClientOpenChange={setEditClientOpen}
            editClientSection={editClientSection}
            onRequestEdit={openEditClient}
          />
          <div className="mt-6">
            <ClientTabs
              client={client}
              activities={clientActivities}
              tasks={clientTasks}
              onEditPersonal={() => openEditClient("personal")}
              onEditContact={() => openEditClient("contact")}
              onEditAddresses={() => openEditClient("addresses")}
              onEditMedicare={() => openEditClient("medicare")}
            />
          </div>
        </div>
      </div>
    </>
  )
}
