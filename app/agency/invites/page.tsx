import { redirect } from "next/navigation"

export default async function AgencyInvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgId } = await searchParams
  const orgParam = orgId ? `?org=${orgId}` : ""
  redirect(`/agency/members${orgParam}`)
}
