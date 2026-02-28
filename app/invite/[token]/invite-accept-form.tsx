"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { acceptInvite } from "@/app/actions/organization-invites"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function InviteAcceptForm({
  token,
  organizationId,
  isSubagencyCreation,
  needsAgentToNameSubagency,
  needsAgencyToNameOrg,
}: {
  token: string
  organizationId: string
  isSubagencyCreation?: boolean
  needsAgentToNameSubagency?: boolean
  needsAgencyToNameOrg?: boolean
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subagencyName, setSubagencyName] = useState("")
  const [agencyName, setAgencyName] = useState("")
  const router = useRouter()

  const needsNameInput = needsAgentToNameSubagency || needsAgencyToNameOrg
  const nameValue = needsAgentToNameSubagency ? subagencyName : agencyName
  const setNameValue = needsAgentToNameSubagency ? setSubagencyName : setAgencyName

  async function handleAccept() {
    setSubmitting(true)
    setError(null)
    try {
      const result = await acceptInvite(
        token,
        needsAgentToNameSubagency ? subagencyName : undefined,
        needsAgencyToNameOrg ? agencyName : undefined
      )
      if (result.error) {
        if (result.error === "ALREADY_MEMBER") {
          router.push("/dashboard")
          return
        }
        setError(result.error)
        return
      }
      if (result.createdSubagencyId) {
        // Navigate directly - do not refresh (invite is now accepted, refresh would show "invalid" error)
        router.push(`/agency?org=${result.createdSubagencyId}`)
      } else {
        const orgParam = result.orgName ? `?org=${encodeURIComponent(result.orgName)}` : ""
        router.push(`/invite/success${orgParam}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleDecline() {
    router.push("/dashboard")
  }

  return (
    <div className="mt-6 space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {needsNameInput && (
        <div className="space-y-2">
          <Label htmlFor="org-name">
            {needsAgentToNameSubagency ? "Subagency name" : "Agency name"}
          </Label>
          <Input
            id="org-name"
            placeholder={needsAgentToNameSubagency ? "Enter subagency name" : "Enter agency name"}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            disabled={submitting}
            className="w-full"
          />
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          onClick={handleAccept}
          disabled={submitting || (needsNameInput && !nameValue.trim())}
        >
          {submitting
            ? isSubagencyCreation
              ? "Creating subagency..."
              : needsAgencyToNameOrg
                ? "Creating agency..."
                : "Accepting..."
            : isSubagencyCreation
              ? "Create subagency"
              : needsAgencyToNameOrg
                ? "Create agency"
                : "Accept"}
        </Button>
        <Button variant="outline" onClick={handleDecline} disabled={submitting}>
          Decline
        </Button>
      </div>
    </div>
  )
}
