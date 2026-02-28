"use server"

import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import * as clientsDb from "@/lib/db/clients"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

function getExtFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg"
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  return "jpg"
}

export async function uploadClientAvatar(
  clientId: string,
  formData: FormData
): Promise<{ imageUrl?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const file = formData.get("file") as File | null
    if (!file || !(file instanceof File))
      return { error: "No file provided" }

    // Validate file size
    if (file.size > MAX_FILE_SIZE)
      return { error: "File too large. Maximum size is 2MB." }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type))
      return { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }

    // Verify user can manage this client (own client or agency book access)
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id, agent_id")
      .eq("id", clientId)
      .single()

    if (!clientRow) return { error: "Client not found" }

    const ext = getExtFromMime(file.type)
    const path = `${clientRow.agent_id}/${clientId}/avatar.${ext}`

    // Use service role for upload - bypasses storage RLS (auth/ownership validated above)
    let storageClient
    try {
      storageClient = createServiceRoleClient()
    } catch {
      return {
        error:
          "Server config error: SUPABASE_SERVICE_ROLE_KEY is required for avatar uploads. Add it to .env.local.",
      }
    }
    const { error: uploadError } = await storageClient.storage
      .from("client-avatars")
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      console.error("Avatar upload error:", uploadError)
      if (uploadError.message?.includes("Bucket not found")) {
        return {
          error:
            "Storage bucket not configured. Create a 'client-avatars' bucket in Supabase Dashboard (Storage).",
        }
      }
      return { error: uploadError.message ?? "Upload failed" }
    }

    const {
      data: { publicUrl },
    } = storageClient.storage.from("client-avatars").getPublicUrl(path)

    await clientsDb.updateClient(user.id, clientId, { imageUrl: publicUrl })

    return { imageUrl: publicUrl }
  } catch (e) {
    console.error("uploadClientAvatar", e)
    return { error: e instanceof Error ? e.message : "Upload failed" }
  }
}
