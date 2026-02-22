"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

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
