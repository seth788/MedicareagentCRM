"use client"

import { useEffect, useState, useCallback } from "react"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { fetchCRMData } from "@/app/actions/crm-data"
import { hydrateCRM, setHydrated, setPersistHandlers, setRefetchCRM } from "@/lib/store"
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
import { goeyToast } from "goey-toast"

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

export function CrmDataLoader({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const { setTheme } = useTheme()
  const refetch = useCallback(() => {
    return doFetchAndHydrate(setTheme)
  }, [setTheme])
  useEffect(() => {
    setRefetchCRM(refetch)
    return () => setRefetchCRM(null)
  }, [refetch])
  useEffect(() => {
    setPersistHandlers({
      addLead: (lead) => {
        persistAddLead(lead).then((r) => r.error && goeyToast.error(r.error))
      },
      updateLead: (id, u) => {
        persistUpdateLead(id, u).then((r) => r.error && goeyToast.error(r.error))
      },
      updateLeadStage: (leadId, stageId) => {
        persistUpdateLeadStage(leadId, stageId).then((r) => r.error && goeyToast.error(r.error))
      },
      deleteLead: (id) => {
        persistDeleteLead(id).then((r) => r.error && goeyToast.error(r.error))
      },
      addClient: (client) => {
        persistAddClient(client).then((r) => r.error && goeyToast.error(r.error))
      },
      updateClient: (clientId, u) => {
        persistUpdateClient(clientId, u).then((r) => r.error && goeyToast.error(r.error))
      },
      addActivity: (activity) => {
        persistAddActivity(activity).then((r) => r.error && goeyToast.error(r.error))
      },
      addTask: (task) => {
        persistAddTask(task).then((r) => r.error && goeyToast.error(r.error))
      },
      completeTask: (taskId) => {
        persistCompleteTask(taskId).then((r) => r.error && goeyToast.error(r.error))
      },
      addFlow: (flow) => {
        persistAddFlow(flow).then((r) => r.error && goeyToast.error(r.error))
      },
      updateFlow: (id, u) => {
        persistUpdateFlow(id, u).then((r) => r.error && goeyToast.error(r.error))
      },
      deleteFlow: (id) => {
        persistDeleteFlow(id).then((r) => r.error && goeyToast.error(r.error))
      },
      addStage: (flowId, stage) => {
        persistAddStage(flowId, stage).then((r) => r.error && goeyToast.error(r.error))
      },
      updateStage: (id, u) => {
        persistUpdateStage(id, u).then((r) => r.error && goeyToast.error(r.error))
      },
      deleteStage: (stageId, moveToStageId) => {
        persistDeleteStage(stageId, moveToStageId).then((r) => r.error && goeyToast.error(r.error))
      },
      addAgentCustomSource: (key, source) => {
        persistAddAgentCustomSource(key, source).then((r) => r.error && goeyToast.error(r.error))
      },
    })
  }, [])
  useEffect(() => {
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
  }, [setTheme])
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
