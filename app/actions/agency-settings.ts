"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"]

function getExtFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg"
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  return "jpg"
}

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

/** Extract storage object path from a Supabase public URL. */
function pathFromLogoUrl(url: string | null, bucketName: string): string | null {
  if (!url) return null
  const prefix = `${bucketName}/`
  const idx = url.indexOf(prefix)
  if (idx === -1) return null
  const after = url.slice(idx + prefix.length)
  const q = after.indexOf("?")
  return q >= 0 ? after.slice(0, q) : after
}

export async function uploadOrganizationLogo(
  organizationId: string,
  formData: FormData
): Promise<{ imageUrl?: string; error?: string }> {
  try {
    const supabase = await createClient()
    await requireOwnerAccess(organizationId)

    const file = formData.get("file") as File | null
    if (!file || !(file instanceof File))
      return { error: "No file provided" }

    if (file.size > MAX_LOGO_SIZE)
      return { error: "File too large. Maximum size is 2MB." }

    if (!ALLOWED_LOGO_TYPES.includes(file.type))
      return { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }

    const ext = getExtFromMime(file.type)

    let storageClient
    try {
      storageClient = createServiceRoleClient()
    } catch {
      return {
        error: "Server config error: SUPABASE_SERVICE_ROLE_KEY is required for logo uploads.",
      }
    }

    const bucketName = "organization-logos"

    // Get current logo URL so we can delete the old file (list() can fail without storage RLS)
    const { data: org } = await supabase
      .from("organizations")
      .select("logo_url")
      .eq("id", organizationId)
      .single()

    const toRemove = new Set<string>()
    const pathFromDb = pathFromLogoUrl(org?.logo_url ?? null, bucketName)
    if (pathFromDb) toRemove.add(pathFromDb)
    toRemove.add(`${organizationId}/logo.jpg`)
    toRemove.add(`${organizationId}/logo.png`)
    toRemove.add(`${organizationId}/logo.webp`)

    const removePaths = [...toRemove]
    const { error: removeError } = await storageClient.storage
      .from(bucketName)
      .remove(removePaths)

    if (removeError) {
      // Best-effort: log but continue (old file may not exist or remove may be blocked)
      console.warn("Organization logo remove (cleanup):", removeError.message)
    }

    // Use unique path each time to avoid overwrite/CDN issues; Supabase recommends new paths over upsert
    const path = `${organizationId}/logo-${Date.now()}.${ext}`

    const { error: uploadError } = await storageClient.storage
      .from(bucketName)
      .upload(path, file, {
        contentType: file.type,
      })

    if (uploadError) {
      console.error("Organization logo upload error:", uploadError)
      if (uploadError.message?.includes("Bucket not found")) {
        return {
          error: "Storage not configured. Create an 'organization-logos' bucket in Supabase Dashboard.",
        }
      }
      return { error: uploadError.message ?? "Upload failed" }
    }

    const { data: { publicUrl } } = storageClient.storage
      .from(bucketName)
      .getPublicUrl(path)

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ logo_url: publicUrl })
      .eq("id", organizationId)

    if (updateError) return { error: updateError.message ?? "Failed to save logo" }

    return { imageUrl: publicUrl }
  } catch (e) {
    console.error("uploadOrganizationLogo", e)
    return { error: e instanceof Error ? e.message : "Upload failed" }
  }
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

export async function deleteOrganizationLogo(
  organizationId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    await requireOwnerAccess(organizationId)

    const { data: org } = await supabase
      .from("organizations")
      .select("logo_url")
      .eq("id", organizationId)
      .single()

    if (!org?.logo_url) return {} // Nothing to delete

    let storageClient
    try {
      storageClient = createServiceRoleClient()
    } catch {
      // Continue without storage cleanup - we'll still clear the DB
    }

    const bucketName = "organization-logos"
    if (storageClient) {
      const toRemove = new Set<string>()
      const pathFromDb = pathFromLogoUrl(org.logo_url, bucketName)
      if (pathFromDb) toRemove.add(pathFromDb)
      toRemove.add(`${organizationId}/logo.jpg`)
      toRemove.add(`${organizationId}/logo.png`)
      toRemove.add(`${organizationId}/logo.webp`)
      const { error: removeError } = await storageClient.storage
        .from(bucketName)
        .remove([...toRemove])
      if (removeError) console.warn("Organization logo storage cleanup:", removeError.message)
    }

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ logo_url: null })
      .eq("id", organizationId)

    if (updateError) return { error: updateError.message ?? "Failed to delete logo" }
    return {}
  } catch (e) {
    console.error("deleteOrganizationLogo", e)
    return { error: e instanceof Error ? e.message : "Failed to delete logo" }
  }
}

export async function updateShowLogoToDownline(
  organizationId: string,
  showLogoToDownline: boolean
): Promise<{ error?: string }> {
  try {
    await requireOwnerAccess(organizationId)
    const supabase = await createClient()
    const { error } = await supabase
      .from("organizations")
      .update({ show_logo_to_downline: showLogoToDownline })
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
