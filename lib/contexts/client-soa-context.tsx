"use client"

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from "react"
import type { SOARecord } from "@/lib/db/soa"

interface ClientSOAState {
  soas: SOARecord[]
  loading: boolean
  /** True when user clicked refresh and fetch is in progress. */
  isRefreshing: boolean
  /** When the SOA data was last successfully fetched. */
  lastFetchedAt: Date | null
  refetch: () => Promise<void>
}

const ClientSOAContext = createContext<ClientSOAState | null>(null)

export function useClientSOA() {
  const ctx = useContext(ClientSOAContext)
  return ctx
}

interface ClientSOAProviderProps {
  clientId: string
  children: ReactNode
}

export function ClientSOAProvider({ clientId, children }: ClientSOAProviderProps) {
  const [soas, setSoas] = useState<SOARecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)

  const fetchSoas = useCallback(
    async (isManualRefresh: boolean) => {
      if (isManualRefresh) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      try {
        const res = await fetch(`/api/soa?clientId=${clientId}`)
        const data = await res.json()
        if (res.ok && Array.isArray(data.soas)) {
          setSoas(data.soas)
          setLastFetchedAt(new Date())
        } else {
          setSoas([])
        }
      } catch {
        setSoas([])
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [clientId]
  )

  // Background fetch on mount — non-blocking
  useEffect(() => {
    fetchSoas(false)
  }, [fetchSoas])

  const refetch = useCallback(() => fetchSoas(true), [fetchSoas])

  const value: ClientSOAState = {
    soas,
    loading,
    isRefreshing,
    lastFetchedAt,
    refetch,
  }

  return (
    <ClientSOAContext.Provider value={value}>
      {children}
    </ClientSOAContext.Provider>
  )
}
