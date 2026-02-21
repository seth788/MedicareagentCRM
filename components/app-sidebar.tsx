"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  Shield,
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

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Flows", url: "/flows", icon: UserPlus },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { setOpenMobile } = useSidebar()

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-foreground">
              MediCRM
            </span>
            <span className="block text-[11px] leading-none text-muted-foreground">
              Medicare Agent Platform
            </span>
          </div>
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
      <SidebarFooter className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            SM
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">Sarah Mitchell</p>
            <p className="truncate text-xs text-muted-foreground">Licensed Agent</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
