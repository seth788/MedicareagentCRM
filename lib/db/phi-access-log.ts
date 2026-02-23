import { createClient } from "@/lib/supabase/server"

export type PhiAccessType = "view" | "export" | "update"

export interface LogPhiAccessParams {
  userId: string
  clientId: string
  fieldAccessed: string
  accessType: PhiAccessType
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Inserts a row into phi_access_log. Call from reveal API and when updating Medicare number.
 */
export async function logPhiAccess(params: LogPhiAccessParams): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from("phi_access_log").insert({
    user_id: params.userId,
    client_id: params.clientId,
    field_accessed: params.fieldAccessed,
    access_type: params.accessType,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
  })
  if (error) {
    // Log error without exposing PHI
    console.error("phi_access_log insert failed:", error.message)
  }
}
