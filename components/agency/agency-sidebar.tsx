"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  ArrowLeft,
  FileText,
} from "@/components/icons"

const navItems = [
  { title: "Dashboard", url: "/agency", icon: LayoutDashboard },
  { title: "Agents", url: "/agency/agents", icon: Users },
  { title: "Reports", url: "/agency/reports", icon: BarChart3 },
  { title: "Members", url: "/agency/members", icon: Users },
  { title: "Settings", url: "/agency/settings", icon: Settings },
  { title: "Audit Log", url: "/agency/audit-log", icon: FileText },
]

export function AgencySidebar({ orgs }: { orgs: { id: string; name: string }[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const orgId = searchParams.get("org") || orgs[0]?.id
  const currentOrg = orgs.find((o) => o.id === orgId) ?? orgs[0]
  const orgParam = orgId ? `?org=${orgId}` : ""

  return (
    <aside className="flex w-56 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{currentOrg?.name ?? "Agency"}</span>
          <span className="text-xs text-muted-foreground">Agency Dashboard</span>
        </div>
      </div>
      {orgs.length > 1 && (
        <div className="border-b px-3 py-2">
          <select
            className="w-full rounded border bg-background px-2 py-1.5 text-sm"
            value={orgId ?? ""}
            onChange={(e) => {
              const url = new URL(window.location.href)
              url.searchParams.set("org", e.target.value)
              window.location.href = url.toString()
            }}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const href = `${item.url}${orgParam}`
          const isActive =
            item.url === "/agency"
              ? pathname === "/agency"
              : pathname === item.url || pathname.startsWith(item.url + "/")
          return (
            <Link
              key={item.title}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to CRM
        </Link>
      </div>
    </aside>
  )
}
