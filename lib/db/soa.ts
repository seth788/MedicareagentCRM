import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export type SOAProduct =
  | "part_d"
  | "part_c"
  | "dental_vision_hearing"
  | "hospital_indemnity"
  | "medigap"

export type SOAStatus =
  | "draft"
  | "sent"
  | "opened"
  | "client_signed"
  | "completed"
  | "expired"
  | "voided"

export type SOADeliveryMethod = "email" | "sms" | "print" | "face_to_face"

export interface SOARecord {
  id: string
  agentId: string
  clientId: string
  status: SOAStatus
  deliveryMethod: SOADeliveryMethod
  secureToken: string
  tokenExpiresAt: string
  language: string
  productsPreselected: SOAProduct[]
  productsSelected: SOAProduct[]
  signerType: "beneficiary" | "representative" | null
  clientTypedSignature: string | null
  clientSignedAt: string | null
  clientIpAddress: string | null
  clientUserAgent: string | null
  repName: string | null
  repRelationship: string | null
  agentName: string
  agentPhone: string | null
  agentNpn: string | null
  beneficiaryName: string
  beneficiaryPhone: string | null
  beneficiaryAddress: string | null
  agentTypedSignature: string | null
  agentSignedAt: string | null
  initialContactMethod: string | null
  appointmentDate: string | null
  signedPdfPath: string | null
  createdAt: string
  updatedAt: string
}

function mapRow(row: Record<string, unknown>): SOARecord {
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  return {
    id: (row.id as string) ?? "",
    agentId: (row.agent_id as string) ?? "",
    clientId: (row.client_id as string) ?? "",
    status: (row.status as SOAStatus) ?? "sent",
    deliveryMethod: (row.delivery_method as SOADeliveryMethod) ?? "email",
    secureToken: (row.secure_token as string) ?? "",
    tokenExpiresAt: (row.token_expires_at as string) ?? "",
    language: (row.language as string) ?? "en",
    productsPreselected: arr(row.products_preselected) as SOAProduct[],
    productsSelected: arr(row.products_selected) as SOAProduct[],
    signerType: (row.signer_type as "beneficiary" | "representative") ?? null,
    clientTypedSignature: (row.client_typed_signature as string) ?? null,
    clientSignedAt: (row.client_signed_at as string) ?? null,
    clientIpAddress: (row.client_ip_address as string) ?? null,
    clientUserAgent: (row.client_user_agent as string) ?? null,
    repName: (row.rep_name as string) ?? null,
    repRelationship: (row.rep_relationship as string) ?? null,
    agentName: (row.agent_name as string) ?? "",
    agentPhone: (row.agent_phone as string) ?? null,
    agentNpn: (row.agent_npn as string) ?? null,
    beneficiaryName: (row.beneficiary_name as string) ?? "",
    beneficiaryPhone: (row.beneficiary_phone as string) ?? null,
    beneficiaryAddress: (row.beneficiary_address as string) ?? null,
    agentTypedSignature: (row.agent_typed_signature as string) ?? null,
    agentSignedAt: (row.agent_signed_at as string) ?? null,
    initialContactMethod: (row.initial_contact_method as string) ?? null,
    appointmentDate: row.appointment_date
      ? String(row.appointment_date).slice(0, 10)
      : null,
    signedPdfPath: (row.signed_pdf_path as string) ?? null,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
  }
}

export async function fetchSOAsForClient(
  agentId: string,
  clientId: string
): Promise<SOARecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("scope_of_appointments")
    .select("*")
    .eq("agent_id", agentId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function fetchSOAById(
  agentId: string,
  soaId: string
): Promise<SOARecord | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("scope_of_appointments")
    .select("*")
    .eq("id", soaId)
    .eq("agent_id", agentId)
    .single()
  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  return data ? mapRow(data) : null
}

export async function getSOAByToken(
  supabase: SupabaseClient,
  token: string
): Promise<SOARecord | null> {
  const { data, error } = await supabase
    .from("scope_of_appointments")
    .select("*")
    .eq("secure_token", token)
    .single()
  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  return data ? mapRow(data) : null
}

export interface SOAAuditEntry {
  id: string
  action: string
  performedBy: string | null
  ipAddress: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export async function fetchSOAAuditLog(
  agentId: string,
  soaId: string
): Promise<SOAAuditEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("soa_audit_log")
    .select("id, action, performed_by, ip_address, metadata, created_at")
    .eq("soa_id", soaId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    performedBy: r.performed_by,
    ipAddress: r.ip_address,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at,
  }))
}

export async function insertSOAAudit(
  supabase: SupabaseClient,
  soaId: string,
  action: string,
  performedBy: string | null,
  ipAddress?: string | null,
  userAgent?: string | null,
  metadata?: Record<string, unknown>
) {
  const { error } = await supabase.from("soa_audit_log").insert({
    soa_id: soaId,
    action,
    performed_by: performedBy,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
    metadata: metadata ?? {},
  })
  if (error) throw error
}
