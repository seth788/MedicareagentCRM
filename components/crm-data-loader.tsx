"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { fetchCRMData, type HydratePayload } from "@/app/actions/crm-data"
import { hydrateCRM, setHydrated, setPersistHandlers, setRefetchCRM, getRefetchCRM } from "@/lib/store"
import {
  persistAddLead,
  persistUpdateLead,
  persistUpdateLeadStage,
  persistDeleteLead,
  persistAddClient,
  persistUpdateClient,
  persistAddActivity,
  persistAddTask,
  persistCompleteTask,
  persistAddFlow,
  persistUpdateFlow,
  persistDeleteFlow,
  persistAddStage,
  persistUpdateStage,
  persistDeleteStage,
  persistAddAgentCustomSource,
} from "@/app/actions/crm-mutations"
import { toast } from "sonner"

function doFetchAndHydrate(setTheme: (theme: string) => void) {
  return fetchCRMData().then((payload) => {
    if (payload) {
      hydrateCRM(payload)
      setTheme(payload.theme)
    } else {
      setHydrated()
    }
  })
}

export function CrmDataLoader({
  children,
  initialData,
}: {
  children: React.ReactNode
  /** When provided, hydrate store immediately and skip client-side fetch on mount. */
  initialData?: HydratePayload | null
}) {
  const hasInitialData = initialData != null
  const [loading, setLoading] = useState(!hasInitialData)
  const { setTheme } = useTheme()
  const initialThemeAppliedRef = useRef(false)
  const refetch = useCallback(() => {
    return doFetchAndHydrate(setTheme)
  }, [setTheme])
  useEffect(() => {
    setRefetchCRM(refetch)
    return () => setRefetchCRM(null)
  }, [refetch])
  useEffect(() => {
    if (hasInitialData && initialData) {
      hydrateCRM(initialData)
      if (!initialThemeAppliedRef.current) {
        initialThemeAppliedRef.current = true
        setTheme(initialData.theme)
      }
    }
  }, [hasInitialData, setTheme, initialData])
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    setPersistHandlers({
      addLead: (lead) => {
        persistAddLead(lead).then((r) => {
          if (r.error) toast.error(r.error)
          if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current)
          refetchTimeoutRef.current = setTimeout(() => {
            refetchTimeoutRef.current = null
            getRefetchCRM()?.()
          }, 1800)
        })
      },
      updateLead: (id, u) => {
        persistUpdateLead(id, u).then((r) => r.error && toast.error(r.error))
      },
      updateLeadStage: (leadId, stageId) => {
        persistUpdateLeadStage(leadId, stageId).then((r) => r.error && toast.error(r.error))
      },
      deleteLead: (id) => {
        persistDeleteLead(id).then((r) => r.error && toast.error(r.error))
      },
      addClient: (client) => {
        persistAddClient(client).then((r) => r.error && toast.error(r.error))
      },
      updateClient: (clientId, u) => {
        persistUpdateClient(clientId, u).then((r) => r.error && toast.error(r.error))
      },
      addActivity: (activity) => {
        persistAddActivity(activity).then((r) => r.error && toast.error(r.error))
      },
      addTask: (task) => {
        persistAddTask(task).then((r) => r.error && toast.error(r.error))
      },
      completeTask: (taskId) => {
        persistCompleteTask(taskId).then((r) => r.error && toast.error(r.error))
      },
      addFlow: (flow) => {
        persistAddFlow(flow).then((r) => r.error && toast.error(r.error))
      },
      updateFlow: (id, u) => {
        persistUpdateFlow(id, u).then((r) => r.error && toast.error(r.error))
      },
      deleteFlow: (id) => {
        persistDeleteFlow(id).then((r) => r.error && toast.error(r.error))
      },
      addStage: (flowId, stage) => {
        persistAddStage(flowId, stage).then((r) => r.error && toast.error(r.error))
      },
      updateStage: (id, u) => {
        persistUpdateStage(id, u).then((r) => r.error && toast.error(r.error))
      },
      deleteStage: (stageId, moveToStageId) => {
        persistDeleteStage(stageId, moveToStageId).then((r) => r.error && toast.error(r.error))
      },
      addAgentCustomSource: (key, source) => {
        persistAddAgentCustomSource(key, source).then((r) => r.error && toast.error(r.error))
      },
    })
  }, [])
  useEffect(() => {
    if (hasInitialData) return
    let cancelled = false
    fetchCRMData()
      .then((payload) => {
        if (cancelled) return
        if (payload) {
          hydrateCRM(payload)
          setTheme(payload.theme)
        } else setHydrated()
      })
      .catch(() => {
        if (!cancelled) setHydrated()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setTheme, hasInitialData])
  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        doFetchAndHydrate(setTheme).catch(() => {})
      }
    })
    return () => subscription.unsubscribe()
  }, [setTheme])
  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <div className="text-muted-foreground">Loading your data…</div>
      </div>
    )
  }
  return <>{children}</>
}
