import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { decrypt } from "@/lib/encryption"
import { logPhiAccess } from "@/lib/db/phi-access-log"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: row, error } = await supabase
    .from("clients")
    .select("id, agent_id, medicare_number")
    .eq("id", clientId)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if ((row as { agent_id: string }).agent_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const medicareNumberRaw = (row as { medicare_number: string | null }).medicare_number
  if (!medicareNumberRaw || medicareNumberRaw.trim() === "") {
    return NextResponse.json({ medicareNumber: "" })
  }

  const decrypted = decrypt(medicareNumberRaw)
  const headersList = await headers()
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null
  const userAgent = headersList.get("user-agent") ?? null

  await logPhiAccess({
    userId: user.id,
    clientId,
    fieldAccessed: "medicare_number",
    accessType: "view",
    ipAddress: ip,
    userAgent,
  })

  return NextResponse.json({ medicareNumber: decrypted })
}
