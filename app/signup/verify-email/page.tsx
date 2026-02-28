import Image from "next/image"
import Link from "next/link"
import { ForceLightTheme } from "@/components/force-light-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "@/components/icons"

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const nextVal = next && next.startsWith("/") ? next : ""
  const loginUrl = nextVal ? `/login?next=${encodeURIComponent(nextVal)}` : "/login"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
      <ForceLightTheme />
      <div className="mb-8 flex items-center justify-center">
        <Image
          src="/logo.svg"
          alt="AdvantaCRM"
          width={140}
          height={36}
          className="h-9 w-auto"
          priority
        />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center">Check your email</CardTitle>
          <CardDescription className="text-center">
            We sent you a verification link. Click the link in the email to activate your account, then sign in to
            continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or try signing up again.
          </p>
          <Button asChild className="w-full">
            <Link href={loginUrl}>Sign in (after verifying)</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already verified?{" "}
            <Link href={loginUrl} className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
