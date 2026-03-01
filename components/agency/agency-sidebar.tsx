"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  ArrowLeft,
  LogOut,
  FileText,
  MoreHorizontal,
} from "@/components/icons"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "@/app/actions/auth"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  }
  return name.slice(0, 2).toUpperCase()
}

const navItems = [
  { title: "Dashboard", url: "/agency", icon: LayoutDashboard },
  { title: "Agents", url: "/agency/agents", icon: Users },
  { title: "Reports", url: "/agency/reports", icon: BarChart3 },
  { title: "Members", url: "/agency/members", icon: Users },
  { title: "Audit Log", url: "/agency/audit-log", icon: FileText },
]

export function AgencySidebar({
  orgs,
  user,
}: {
  orgs: { id: string; name: string; logoUrl?: string | null }[]
  user: { displayName: string; email: string; avatarUrl: string | null }
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const orgId = searchParams.get("org") || orgs[0]?.id
  const currentOrg = orgs.find((o) => o.id === orgId) ?? orgs[0]
  const orgParam = orgId ? `?org=${orgId}` : ""

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-4 sm:px-4 sm:py-5">
        <Link href={`/agency${orgParam}`} className="flex min-w-0 items-center gap-2.5">
          {currentOrg?.logoUrl ? (
              <img
                src={currentOrg.logoUrl}
                alt={currentOrg?.name ?? "Agency"}
                className="h-9 max-w-[140px] object-contain object-left"
              />
            ) : (
              <div className="min-w-0 flex-1">
                <span className="truncate block text-sm font-medium">{currentOrg?.name ?? "Agency"}</span>
                <span className="text-xs text-muted-foreground">Agency Dashboard</span>
              </div>
            )}
        </Link>
      </SidebarHeader>
      {orgs.length > 1 && (
        <div className="px-3 pb-2">
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
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const href = `${item.url}${orgParam}`
                const isActive =
                  item.url === "/agency"
                    ? pathname === "/agency"
                    : pathname === item.url || pathname.startsWith(item.url + "/")
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 py-3 sm:px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-h-[40px] w-full items-center gap-3 rounded-md p-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:p-1.5"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
                <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{user.displayName}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {user.email || "—"}
                </p>
              </div>
              <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
                <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{user.displayName}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {user.email || "—"}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="flex cursor-pointer items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to CRM
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/agency/settings${orgParam}`} className="flex cursor-pointer items-center gap-2">
                <Settings className="h-4 w-4" />
                Agency Settings
              </Link>
            </DropdownMenuItem>
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button type="submit" className="flex w-full cursor-pointer items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
