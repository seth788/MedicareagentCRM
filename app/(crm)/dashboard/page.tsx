"use client"

import dynamic from "next/dynamic"

const DashboardPageInner = dynamic(
  () => import("@/components/pages/dashboard-page"),
  { ssr: false }
)

export default function DashboardPage() {
  return <DashboardPageInner />
}
