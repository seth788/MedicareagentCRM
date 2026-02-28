import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { getUserMemberOrgsWithRoles, ROLES_CAN_CREATE_AGENCY } from "@/lib/db/organizations"
import { createSubagencyRequest, getMySubagencyRequests } from "@/app/actions/subagency-request"
import { ForceLightTheme } from "@/components/force-light-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SubagencyRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/organization/subagency-request")

  const memberOrgsWithRoles = await getUserMemberOrgsWithRoles(user.id)
  const canRequest = memberOrgsWithRoles.some((m) =>
    ROLES_CAN_CREATE_AGENCY.includes(m.role as (typeof ROLES_CAN_CREATE_AGENCY)[number])
  )
  if (!canRequest) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
        <ForceLightTheme />
        <div className="mb-8 flex items-center justify-center">
          <Link href="/dashboard">
            <Image src="/logo.svg" alt="AdvantaCRM" width={140} height={36} className="h-9 w-auto" priority />
          </Link>
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Cannot request subagency</CardTitle>
            <CardDescription>
              LOA and community agents cannot create subagencies. Contact your agency owner if you need to create one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const requests = await getMySubagencyRequests(user.id)
  const pendingCount = requests.filter((r) => r.status === "pending").length
  const { success } = await searchParams

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
      <ForceLightTheme />
      <div className="mb-8 flex items-center justify-center">
        <Link href="/dashboard">
          <Image src="/logo.svg" alt="AdvantaCRM" width={140} height={36} className="h-9 w-auto" priority />
        </Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Request subagency</CardTitle>
          <CardDescription>
            Submit a request to your top-line agency to create a subagency. They will review and approve placement in the organization tree.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {success === "requested" && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-3 text-sm text-green-800 dark:text-green-200">
              Your request has been submitted. Your top-line agency owner will review it and send you an invite if approved.
            </div>
          )}
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground">
              You have {pendingCount} pending request{pendingCount > 1 ? "s" : ""}.
            </p>
          )}
          <form action={createSubagencyRequest}>
            <Button type="submit" className="w-full">
              Submit subagency request
            </Button>
          </form>
          {requests.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">Your requests</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {requests.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    {new Date(r.requested_at).toLocaleDateString()} — {r.status}
                    {r.created_subagency_id && " (approved)"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
