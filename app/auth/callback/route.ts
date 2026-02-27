import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  let next = searchParams.get("next") ?? "/dashboard"
  if (!next.startsWith("/")) {
    next = "/dashboard"
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const fromLogin = next.startsWith("/invite/") ? `${next}${next.includes("?") ? "&" : "?"}from_login=1` : next
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"
      const base = isLocalEnv ? origin : forwardedHost ? `https://${forwardedHost}` : origin
      if (isLocalEnv) {
        return NextResponse.redirect(`${base}${fromLogin}`)
      }
      if (forwardedHost) {
        return NextResponse.redirect(`${base}${fromLogin}`)
      }
      return NextResponse.redirect(`${origin}${fromLogin}`)
    }
  }

  const nextParam = searchParams.get("next")
  const nextQuery = nextParam && nextParam.startsWith("/") ? `&next=${encodeURIComponent(nextParam)}` : ""
  return NextResponse.redirect(`${origin}/login?error=auth${nextQuery}`)
}
