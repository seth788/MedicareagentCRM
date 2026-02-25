"use client"

import dynamic from "next/dynamic"

const PendingPageInner = dynamic(
  () => import("@/components/pages/pending-page"),
  { ssr: false }
)

export default function PendingPage() {
  return <PendingPageInner />
}
