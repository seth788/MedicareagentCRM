import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getUserDashboardOrgs } from "@/lib/db/organizations"
import { AgencySidebar } from "@/components/agency/agency-sidebar"
import { Toaster } from "@/components/ui/sonner"

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

  const dashboardOrgs = await getUserDashboardOrgs(user.id)
  if (dashboardOrgs.length === 0) redirect("/dashboard")

  return (
    <div className="flex min-h-svh">
      <Suspense fallback={<div className="w-56 border-r bg-card" />}>
        <AgencySidebar orgs={dashboardOrgs} />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
      <Toaster position="bottom-right" />
    </div>
  )
}
