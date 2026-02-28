import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { getOrCreateProfile } from "@/lib/db/profiles"
import { AgencyLayoutClient } from "@/components/agency/agency-layout-client"

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/agency")

  const [dashboardOrgs, profile] = await Promise.all([
    getUserDashboardOrgs(user.id),
    getOrCreateProfile(
      user.id,
      (user.user_metadata?.full_name as string) ?? user.email ?? undefined
    ),
  ])
  if (dashboardOrgs.length === 0) redirect("/dashboard")

  const displayName =
    (profile?.display_name as string)?.trim() ||
    (user.user_metadata?.full_name as string)?.trim() ||
    user.email ||
    "Agent"
  const avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url?.trim() || null

  return (
    <Suspense fallback={<div className="flex min-h-svh w-full" />}>
      <AgencyLayoutClient
        orgs={dashboardOrgs}
        user={{ displayName, email: user.email ?? "", avatarUrl }}
      >
        {children}
      </AgencyLayoutClient>
    </Suspense>
  )
}
