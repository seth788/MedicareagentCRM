"use client"

import dynamic from "next/dynamic"

const LeadsPageInner = dynamic(
  () => import("@/components/pages/leads-page"),
  { ssr: false }
)

export default function FlowsPage() {
  return <LeadsPageInner />
}
