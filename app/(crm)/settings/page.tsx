"use client"

import dynamic from "next/dynamic"

const SettingsPageInner = dynamic(
  () => import("@/components/pages/settings-page"),
  { ssr: false }
)

export default function SettingsPage() {
  return <SettingsPageInner />
}
