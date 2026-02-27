"use client"

import { useRouter, useSearchParams } from "next/navigation"

export function AgentsSubOrgFilter({
  subOrgs,
  baseUrl,
  currentSubOrg,
}: {
  subOrgs: { id: string; name: string }[]
  baseUrl: string
  currentSubOrg?: string | null
}) {
  const router = useRouter()

  if (subOrgs.length === 0) return null

  return (
    <select
      className="rounded border bg-background px-3 py-2 text-sm"
      value={currentSubOrg ?? ""}
      onChange={(e) => {
        const v = e.target.value
        router.push(v ? `${baseUrl}&sub_org=${v}` : baseUrl)
      }}
    >
      <option value="">All</option>
      {subOrgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}
