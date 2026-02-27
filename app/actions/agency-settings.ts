"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

async function requireOwnerAccess(organizationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", organizationId)
    .single()

  if (!org || org.owner_id !== user.id) throw new Error("Only the owner can perform this action")
  return user.id
}

export async function updateOrganizationName(
  organizationId: string,
  name: string
): Promise<{ error?: string }> {
  try {
    await requireOwnerAccess(organizationId)
    const supabase = await createClient()
    const { error } = await supabase
      .from("organizations")
      .update({ name: name.trim() })
      .eq("id", organizationId)
    if (error) return { error: error.message }
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update" }
  }
}

export async function deleteOrganization(
  organizationId: string
): Promise<{ error?: string }> {
  try {
    await requireOwnerAccess(organizationId)
    const serviceSupabase = createServiceRoleClient()
    const { error } = await serviceSupabase
      .from("organizations")
      .delete()
      .eq("id", organizationId)
    if (error) return { error: error.message }
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete" }
  }
}
