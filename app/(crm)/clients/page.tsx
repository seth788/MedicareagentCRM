"use client"

import dynamic from "next/dynamic"

const ClientsPageInner = dynamic(
  () => import("@/components/pages/clients-page"),
  { ssr: false }
)

export default function ClientsPage() {
  return <ClientsPageInner />
}
