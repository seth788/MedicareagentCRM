"use client"

import { usePathname } from "next/navigation"
import { AppHeader } from "@/components/app-header"

const TITLE_MAP: Record<string, string> = {
  "/agency": "Dashboard",
  "/agency/agents": "Agents",
  "/agency/reports": "Reports",
  "/agency/reports/production": "Production Report",
  "/agency/reports/roster": "Roster Report",
  "/agency/reports/clients": "Clients Report",
  "/agency/members": "Members",
  "/agency/audit-log": "Audit Log",
  "/agency/settings": "Agency Settings",
  "/agency/invites": "Invites",
}

function getTitle(pathname: string): string {
  // Check exact matches first, then prefixes (longest first)
  const exact = TITLE_MAP[pathname]
  if (exact) return exact

  const sorted = Object.entries(TITLE_MAP).sort(
    (a, b) => b[0].length - a[0].length
  )
  for (const [path, title] of sorted) {
    if (path !== "/agency" && pathname.startsWith(path)) return title
  }
  return "Agency"
}

export function AgencyHeader() {
  const pathname = usePathname()
  const title = getTitle(pathname ?? "")

  const openCmd = () => {
    const fn = (window as unknown as Record<string, unknown>).__openCommandPalette
    if (typeof fn === "function") (fn as () => void)()
  }

  return <AppHeader title={title} onOpenCommandPalette={openCmd} />
}
