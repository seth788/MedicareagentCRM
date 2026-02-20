"use client"

import dynamic from "next/dynamic"

const ClientProfileInner = dynamic(
  () => import("@/components/pages/client-profile-page"),
  { ssr: false }
)

export default function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <ClientProfileInner params={params} />
}
