"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserMemberOrgsWithRoles, ROLES_CAN_CREATE_AGENCY } from "@/lib/db/organizations"
import { getRootOrgId } from "@/lib/db/agency"

export async function createSubagencyRequest(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const memberOrgsWithRoles = await getUserMemberOrgsWithRoles(user.id)
  const canRequest = memberOrgsWithRoles.some((m) =>
    ROLES_CAN_CREATE_AGENCY.includes(m.role as (typeof ROLES_CAN_CREATE_AGENCY)[number])
  )
  if (!canRequest) {
    return { error: "LOA and community agents cannot create subagencies." }
  }

  const rootOrgId = await getRootOrgId(memberOrgsWithRoles[0].id)

  const { error } = await supabase.from("subagency_creation_requests").insert({
    requesting_user_id: user.id,
    root_organization_id: rootOrgId,
    status: "pending",
  })

  if (error) return { error: error.message }
  redirect("/organization/subagency-request?success=requested")
}

export async function getMySubagencyRequests(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("subagency_creation_requests")
    .select("id, root_organization_id, status, requested_at, reviewed_at, placement_parent_organization_id, created_subagency_id")
    .eq("requesting_user_id", userId)
    .order("requested_at", { ascending: false })

  if (error) return []
  return data ?? []
}
