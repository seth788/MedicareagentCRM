"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCRMStore } from "@/lib/store"

/** Syncs logged-in user to store currentAgent and listens for sign out. */
export function AuthSync() {
  const { setCurrentAgent } = useCRMStore()

  useEffect(() => {
    const supabase = createClient()
    const setAgentFromUser = (email: string | undefined, fullName: string | undefined) => {
      const name = fullName?.trim() || email || "Agent"
      setCurrentAgent(name)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const fn = session.user.user_metadata?.full_name as string | undefined
        setAgentFromUser(session.user.email ?? undefined, fn)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const fn = session.user.user_metadata?.full_name as string | undefined
        setAgentFromUser(session.user.email ?? undefined, fn)
      }
    })
    return () => subscription.unsubscribe()
  }, [setCurrentAgent])

  return null
}
