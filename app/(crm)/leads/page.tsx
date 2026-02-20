import { redirect } from "next/navigation"

export default async function LeadsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      value.forEach((v) => q.append(key, v))
    } else {
      q.append(key, value)
    }
  }
  const queryString = q.toString()
  redirect(`/flows${queryString ? `?${queryString}` : ""}`)
}
