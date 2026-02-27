import Image from "next/image"
import Link from "next/link"
import { ForceLightTheme } from "@/components/force-light-theme"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "@/components/icons"

export default async function InviteSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org } = await searchParams
  const orgName = org ?? "the agency"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
      <ForceLightTheme />
      <div className="mb-8 flex items-center justify-center">
        <Image src="/logo.svg" alt="AdvantaCRM" width={140} height={36} className="h-9 w-auto" priority />
      </div>
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold">You&apos;ve been added</h1>
        <p className="mt-2 text-muted-foreground">
          You&apos;ve successfully joined <strong>{orgName}</strong>.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
