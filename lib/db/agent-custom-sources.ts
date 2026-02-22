import { createClient } from "@/lib/supabase/server"

export async function fetchCustomSources(agentId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("agent_custom_sources")
    .select("source")
    .eq("agent_id", agentId)
    .order("source")
  if (error) throw error
  return (data ?? []).map((r) => r.source)
}

export async function addCustomSource(agentId: string, source: string): Promise<void> {
  const supabase = await createClient()
  const trimmed = source.trim()
  if (!trimmed) return
  await supabase.from("agent_custom_sources").upsert(
    { agent_id: agentId, source: trimmed },
    { onConflict: "agent_id,source" }
  )
}
