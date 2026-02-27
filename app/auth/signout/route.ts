import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const next = searchParams.get("next")
  const redirectTo = next && next.startsWith("/") ? next : "/login"

  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL(redirectTo, request.url))
}
