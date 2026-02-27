import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getInviteByToken, isUserMemberOfOrg } from "@/lib/db/organization-invites"
import { ForceLightTheme } from "@/components/force-light-theme"
import { InviteAcceptForm } from "./invite-accept-form"

function roleLabel(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ from_login?: string }>
}) {
  const { token } = await params
  const { from_login } = await searchParams
  const inviteData = await getInviteByToken(token)

  if (!inviteData) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
        <ForceLightTheme />
        <div className="mb-8 flex items-center justify-center">
          <Image src="/logo.svg" alt="AdvantaCRM" width={140} height={36} className="h-9 w-auto" priority />
        </div>
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-destructive">This invite link is no longer valid.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may have expired, been revoked, or reached its maximum uses.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && !from_login) {
    redirect(`/auth/signout?next=${encodeURIComponent(`/invite/${token}`)}`)
  }

  const isMember = user ? await isUserMemberOfOrg(user.id, inviteData.organizationId) : false

  if (!user) {
    const loginUrl = `/login?next=${encodeURIComponent(`/invite/${token}`)}`
    const signupUrl = `/signup?next=${encodeURIComponent(`/invite/${token}`)}`
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
        <ForceLightTheme />
        <div className="mb-8 flex items-center justify-center">
          <Image src="/logo.svg" alt="AdvantaCRM" width={140} height={36} className="h-9 w-auto" priority />
        </div>
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">You&apos;ve been invited</h1>
          <p className="mt-2 text-muted-foreground">
            Join <strong>{inviteData.organizationName}</strong> as a {roleLabel(inviteData.role)}. Sign in or create an
            account to accept.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={loginUrl}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Log In
            </Link>
            <Link
              href={signupUrl}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isMember) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
        <ForceLightTheme />
        <div className="mb-8 flex items-center justify-center">
          <Image src="/logo.svg" alt="AdvantaCRM" width={140} height={36} className="h-9 w-auto" priority />
        </div>
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">You&apos;re already a member</h1>
          <p className="mt-2 text-muted-foreground">
            You&apos;re already a member of <strong>{inviteData.organizationName}</strong>.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
      <ForceLightTheme />
      <div className="mb-8 flex items-center justify-center">
        <Image src="/logo.svg" alt="AdvantaCRM" width={140} height={36} className="h-9 w-auto" priority />
      </div>
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">You&apos;ve been invited to join</h1>
        <p className="mt-2 text-muted-foreground">
          <strong>{inviteData.organizationName}</strong> as a {roleLabel(inviteData.role)}.
        </p>
        <InviteAcceptForm token={token} organizationId={inviteData.organizationId} />
      </div>
    </div>
  )
}
