"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getRefetchCRM } from "@/lib/store"
import Link from "next/link"
import { format, differenceInDays, differenceInCalendarDays, startOfDay } from "date-fns"
import { parseLocalDate, getT65FromDob, getAgeFromDob } from "@/lib/date-utils"
import { Plus, Search, Phone, Mail } from "@/components/icons"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NewClientDialog } from "@/components/clients/new-client-dialog"
import { useCRMStore } from "@/lib/store"
import { getPreferredOrFirstAddress, getPreferredOrFirstPhone, getPreferredOrFirstEmail } from "@/lib/utils"

type QuickFilter = "all" | "turning65"

export default function ClientsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [newOpen, setNewOpen] = useState(searchParams.get("new") === "true")
  const [search, setSearch] = useState("")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all")
  const { clients, hydrated } = useCRMStore()

  const today = startOfDay(new Date())

  useEffect(() => {
    if (hydrated && clients.length === 0) {
      getRefetchCRM()?.()
    }
  }, [hydrated, clients.length])

  const filtered = useMemo(() => {
    let result = [...clients]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) => {
          const addr = getPreferredOrFirstAddress(c)
          const city = addr?.city?.toLowerCase() ?? ""
          const phone = getPreferredOrFirstPhone(c)?.number ?? ""
          const email = getPreferredOrFirstEmail(c)?.value ?? ""
          return (
            c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q) ||
            email.toLowerCase().includes(q) ||
            phone.includes(q) ||
            city.includes(q)
          )
        }
      )
    }
    if (quickFilter === "turning65") {
      result = result.filter((c) => {
        const age = getAgeFromDob(c.dob)
        if (age >= 65) return false
        const t65 = getT65FromDob(c.dob)
        const t65Date = parseLocalDate(t65)
        if (Number.isNaN(t65Date.getTime())) return false
        const days = differenceInCalendarDays(t65Date, today)
        return days >= 0
      })
    }
    return result
  }, [clients, search, quickFilter, today])

  const openCmd = () => {
    const fn = (window as unknown as Record<string, unknown>).__openCommandPalette
    if (typeof fn === "function") (fn as () => void)()
  }

  return (
    <>
      <AppHeader title="Clients" onOpenCommandPalette={openCmd}>
        <Button size="sm" className="min-h-[40px]" onClick={() => setNewOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Client
        </Button>
      </AppHeader>

      <div className="flex-1 overflow-auto overflow-x-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-6">
          <div className="relative min-w-0 flex-1 md:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              className="h-8 pl-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(
              [
                { label: "All", value: "all" },
                { label: "Turning 65", value: "turning65" },
              ] as const
            ).map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={quickFilter === f.value ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setQuickFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="min-w-0 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    <span className="lg:hidden">Client</span>
                    <span className="hidden lg:inline">Name</span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead className="hidden lg:table-cell">Turning 65</TableHead>
                  <TableHead className="hidden lg:table-cell">Coverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm text-muted-foreground">No clients found</p>
                        <Button size="sm" variant="outline" className="min-h-[40px]" onClick={() => setNewOpen(true)}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Add Client
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((client) => {
                    const t65 = getT65FromDob(client.dob)
                    const age = getAgeFromDob(client.dob)
                    const days = differenceInCalendarDays(parseLocalDate(t65), today)
                    const isSoon = days >= 0 && days <= 60
                    return (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/clients/${client.id}`)}
                      >
                        {/* Stacked profile for small/medium: one cell with all data */}
                        <TableCell className="py-3 lg:hidden" colSpan={6}>
                          <div className="flex flex-col gap-0.5">
                            <Link
                              href={`/clients/${client.id}`}
                              className="font-medium text-foreground hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {client.firstName} {client.lastName}
                            </Link>
                            {(() => {
                              const phone = getPreferredOrFirstPhone(client)?.number
                              if (phone) {
                                return (
                                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 shrink-0" />
                                    {phone}
                                  </span>
                                )
                              }
                              return null
                            })()}
                            {(() => {
                              const email = getPreferredOrFirstEmail(client)?.value
                              if (email) {
                                return (
                                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5 shrink-0" />
                                    {email}
                                  </span>
                                )
                              }
                              return null
                            })()}
                            {(() => {
                              const addr = getPreferredOrFirstAddress(client)
                              const location = addr ? [addr.city, addr.state].filter(Boolean).join(", ") : ""
                              if (location) {
                                return <span className="text-sm text-muted-foreground">{location}</span>
                              }
                              return null
                            })()}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="text-sm text-foreground">
                                {age >= 65 ? `Age ${age}` : format(parseLocalDate(t65), "MMM d, yyyy")}
                              </span>
                              {isSoon && days >= 0 && (
                                <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]" variant="outline">
                                  {days}d
                                </Badge>
                              )}
                              {(client.coverages?.length ?? 0) > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {client.coverages!.length === 1
                                    ? `${client.coverages![0].carrier} - ${client.coverages![0].planType}`
                                    : `${client.coverages!.length} plans`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {/* Desktop columns */}
                        <TableCell className="hidden lg:table-cell">
                          <Link
                            href={`/clients/${client.id}`}
                            className="block py-1 font-medium text-foreground hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {client.firstName} {client.lastName}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {(() => {
                            const phone = getPreferredOrFirstPhone(client)?.number
                            if (!phone) return "—"
                            return (
                              <span className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 shrink-0" />
                                {phone}
                              </span>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {(() => {
                            const email = getPreferredOrFirstEmail(client)?.value
                            if (!email) return "—"
                            return (
                              <span className="flex items-center gap-1.5">
                                <Mail className="h-3 w-3 shrink-0" />
                                {email}
                              </span>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {(() => {
                            const addr = getPreferredOrFirstAddress(client)
                            return addr ? [addr.city, addr.state].filter(Boolean).join(", ") : ""
                          })()}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground">
                              {age >= 65
                                ? `Age ${age}`
                                : format(parseLocalDate(t65), "MMM d, yyyy")}
                            </span>
                            {isSoon && days >= 0 && (
                              <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]" variant="outline">
                                {days}d
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {(client.coverages?.length ?? 0) > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {client.coverages!.length === 1
                                ? `${client.coverages![0].carrier} - ${client.coverages![0].planType}`
                                : `${client.coverages!.length} plans`}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <NewClientDialog open={newOpen} onOpenChange={setNewOpen} />
    </>
  )
}
