"use client"

import { use, useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { notFound, useRouter, useSearchParams, usePathname } from "next/navigation"
import { ArrowLeft } from "@/components/icons"
import { toast } from "sonner"
import { AppHeader } from "@/components/app-header"
import { ClientProfileHeader } from "@/components/clients/profile-header"
import { ClientTabs, CLIENT_SECTIONS } from "@/components/clients/client-tabs"
import { SectionIconSidebar } from "@/components/section-icon-sidebar"
import type { EditClientSection } from "@/components/clients/edit-client-dialog"
import type { SectionId } from "@/components/clients/sections"
import { useCRMStore } from "@/lib/store"
import { ClientSOAProvider } from "@/lib/contexts/client-soa-context"

const VALID_SECTIONS: SectionId[] = ["contact", "health", "medicare", "coverage", "notes", "soa"]
function isValidSection(value: string | null): value is SectionId {
  return value !== null && VALID_SECTIONS.includes(value as SectionId)
}

export default function ClientProfilePageInner({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { clients, activities, tasks } = useCRMStore()
  const client = clients.find((c) => c.id === id)
  const [editClientOpen, setEditClientOpen] = useState(false)
  const [editClientSection, setEditClientSection] = useState<EditClientSection | null>(null)
  const hasShownNewToast = useRef(false)
  const sectionFromUrl = searchParams.get("section")
  const [activeSection, setActiveSection] = useState<SectionId>(
    isValidSection(sectionFromUrl) ? sectionFromUrl : "contact"
  )

  const handleSectionChange = useCallback(
    (section: SectionId) => {
      setActiveSection(section)
      const params = new URLSearchParams(searchParams.toString())
      if (section === "contact") params.delete("section")
      else params.set("section", section)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  useEffect(() => {
    const section = searchParams.get("section")
    const next = isValidSection(section) ? section : "contact"
    setActiveSection(next)
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get("new") !== "1" || !client || hasShownNewToast.current) return
    hasShownNewToast.current = true
    toast.info("You can complete setting up the profile")
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
      <ClientSOAProvider clientId={id}>
      <div className="flex flex-1 min-h-0">
        <SectionIconSidebar
          items={CLIENT_SECTIONS}
          activeId={activeSection}
          basePath={`/clients/${id}`}
        />
        <div className="flex-1 min-w-0 overflow-auto overflow-x-hidden">
          <div className="mx-auto min-w-0 max-w-6xl px-4 py-6 sm:px-6">
            <ClientProfileHeader
              client={client}
              editClientOpen={editClientOpen}
              onEditClientOpenChange={setEditClientOpen}
              editClientSection={editClientSection}
              onRequestEdit={openEditClient}
            />
            <div className="mt-2">
              <ClientTabs
                client={client}
                activities={clientActivities}
                tasks={clientTasks}
                onEditPersonal={() => openEditClient("personal")}
                onEditContact={() => openEditClient("contact")}
                onEditAddresses={() => openEditClient("addresses")}
                onEditMedicare={() => openEditClient("medicare")}
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
              />
            </div>
          </div>
        </div>
      </div>
      </ClientSOAProvider>
    </>
  )
}
