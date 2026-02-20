"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  Plus,
  Search,
} from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import { useCRMStore } from "@/lib/store"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { leads, clients, getStageById } = useCRMStore()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigate = useCallback(
    (path: string) => {
      setOpen(false)
      router.push(path)
    },
    [router]
  )

  // expose open function globally
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__openCommandPalette = () => setOpen(true)
    return () => {
      delete (window as unknown as Record<string, unknown>).__openCommandPalette
    }
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search clients, leads, or navigate..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate("/flows")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Flows
          </CommandItem>
          <CommandItem onSelect={() => navigate("/clients")}>
            <Users className="mr-2 h-4 w-4" />
            Clients
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => navigate("/clients?new=true")}>
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Clients">
          {clients.slice(0, 5).map((c) => (
            <CommandItem
              key={c.id}
              onSelect={() => navigate(`/clients/${c.id}`)}
            >
              <Search className="mr-2 h-4 w-4" />
              {c.firstName} {c.lastName}
              <span className="ml-auto text-xs text-muted-foreground">
                {c.city}, {c.state}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Flows">
          {leads.slice(0, 5).map((l) => (
            <CommandItem
              key={l.id}
              onSelect={() => navigate("/flows")}
            >
              <Search className="mr-2 h-4 w-4" />
              {l.firstName} {l.lastName}
              <span className="ml-auto text-xs text-muted-foreground">
                {getStageById(l.stageId)?.name ?? l.stageId}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
