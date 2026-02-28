"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Clock,
  Settings,
  LogOut,
  MoreHorizontal,
  FilterIcon,
} from "@/components/icons"
import { useIsMobile } from "@/hooks/use-mobile"
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
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCRMStore } from "@/lib/store"
import { signOut } from "@/app/actions/auth"

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Flows", url: "/flows", icon: BarChart3 },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Reports", url: "/reports", icon: FilterIcon },
  { title: "Pending", url: "/pending", icon: Clock },
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  }
  return name.slice(0, 2).toUpperCase()
}

export function AppSidebar() {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { setOpenMobile } = useSidebar()
  const { currentAgent, currentAgentEmail, currentAgentAvatarUrl, dashboardOrgs } = useCRMStore()
  const hasAgencyAccess = dashboardOrgs.length > 0

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-4 sm:px-4 sm:py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="AdvantaCRM"
            width={112}
            height={29}
            className="h-7 w-auto dark:hidden"
            priority
          />
          <Image
            src="/logo-dark.svg"
            alt="AdvantaCRM"
            width={112}
            height={29}
            className="hidden h-7 w-auto dark:block"
            priority
          />
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(item.url + "/")
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
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
                <AvatarImage src={currentAgentAvatarUrl ?? undefined} alt={currentAgent} />
                <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                  {getInitials(currentAgent)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{currentAgent}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {currentAgentEmail || "—"}
                </p>
              </div>
              <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={currentAgentAvatarUrl ?? undefined} alt={currentAgent} />
                <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                  {getInitials(currentAgent)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{currentAgent}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {currentAgentEmail || "—"}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            {hasAgencyAccess && (
              <>
                {dashboardOrgs.length === 1 ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/agency?org=${dashboardOrgs[0].id}`} className="flex cursor-pointer items-center gap-2">
                      <Users className="h-4 w-4" />
                      Agency
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  dashboardOrgs.map((org) => (
                    <DropdownMenuItem key={org.id} asChild>
                      <Link href={`/agency?org=${org.id}`} className="flex cursor-pointer items-center gap-2">
                        <Users className="h-4 w-4" />
                        {org.name}
                      </Link>
                    </DropdownMenuItem>
                  ))
                )}
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex cursor-pointer items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
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
