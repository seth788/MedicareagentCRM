"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { acceptInvite } from "@/app/actions/organization-invites"
import { Button } from "@/components/ui/button"

export function InviteAcceptForm({ token, organizationId }: { token: string; organizationId: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleAccept() {
    setSubmitting(true)
    setError(null)
    const result = await acceptInvite(token)
    if (result.error) {
      if (result.error === "ALREADY_MEMBER") {
        router.push("/dashboard")
        return
      }
      setError(result.error)
      setSubmitting(false)
      return
    }
    if (result.setupAgency) {
      router.push(`/organization/create?parent_org_id=${organizationId}`)
    } else {
      const orgParam = result.orgName ? `?org=${encodeURIComponent(result.orgName)}` : ""
      router.push(`/invite/success${orgParam}`)
    }
  }

  function handleDecline() {
    router.push("/dashboard")
  }

  return (
    <div className="mt-6 space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={handleAccept} disabled={submitting}>
          {submitting ? "Accepting..." : "Accept"}
        </Button>
        <Button variant="outline" onClick={handleDecline} disabled={submitting}>
          Decline
        </Button>
      </div>
    </div>
  )
}
