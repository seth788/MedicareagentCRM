"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signInWithGoogle() {
  const supabase = await createClient()
  const h = await headers()
  const host = h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http"
  const origin = `${proto}://${host}`
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })
  if (error) {
    return { error: error.message }
  }
  if (data?.url) {
    redirect(data.url)
  }
  return { error: "Failed to get OAuth URL" }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string
  if (!email || !password) {
    return { error: "Email and password are required." }
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }
  redirect("/dashboard")
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string
  const fullName = (formData.get("fullName") as string)?.trim()
  if (!email || !password) {
    return { error: "Email and password are required." }
  }
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: fullName ? { data: { full_name: fullName } } : undefined,
  })
  if (error) {
    return { error: error.message }
  }
  redirect("/dashboard")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
