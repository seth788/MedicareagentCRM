import { createClient } from "@/lib/supabase/server"

export interface FlowTemplateStage {
  id: string
  templateId: string
  name: string
  color: string
  sortOrder: number
}

export interface FlowTemplate {
  id: string
  name: string
  description: string | null
  category: string
  icon: string | null
  sortOrder: number
  stages: FlowTemplateStage[]
}

export async function getFlowTemplates(): Promise<FlowTemplate[]> {
  const supabase = await createClient()
  const { data: templates, error: templatesError } = await supabase
    .from("flow_templates")
    .select("id, name, description, category, icon, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
  if (templatesError) throw templatesError
  if (!templates?.length) return []

  const { data: stages, error: stagesError } = await supabase
    .from("flow_template_stages")
    .select("id, template_id, name, color, sort_order")
    .in(
      "template_id",
      templates.map((t) => t.id)
    )
    .order("sort_order", { ascending: true })
  if (stagesError) throw stagesError

  const stagesByTemplate = (stages ?? []).reduce<Record<string, FlowTemplateStage[]>>((acc, s) => {
    const list = acc[s.template_id] ?? []
    list.push({
      id: s.id,
      templateId: s.template_id,
      name: s.name,
      color: s.color,
      sortOrder: s.sort_order,
    })
    acc[s.template_id] = list
    return acc
  }, {})

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    category: t.category,
    icon: t.icon ?? null,
    sortOrder: t.sort_order,
    stages: stagesByTemplate[t.id] ?? [],
  }))
}

/** Creates a new flow and stages for the agent by copying from a template. Returns the new flow id. */
export async function createFlowFromTemplate(
  agentId: string,
  templateId: string
): Promise<{ flowId: string }> {
  const supabase = await createClient()
  const { data: template, error: templateError } = await supabase
    .from("flow_templates")
    .select("id, name")
    .eq("id", templateId)
    .eq("is_active", true)
    .single()
  if (templateError || !template) throw new Error("Template not found")

  const { data: templateStages, error: stagesError } = await supabase
    .from("flow_template_stages")
    .select("name, color, sort_order")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true })
  if (stagesError) throw stagesError
  if (!templateStages?.length) throw new Error("Template has no stages")

  const flowId = crypto.randomUUID()
  const maxOrderResult = await supabase
    .from("flows")
    .select("order")
    .eq("agent_id", agentId)
    .order("order", { ascending: false })
    .limit(1)
  const maxOrder = maxOrderResult.data?.[0]?.order ?? -1

  const { error: flowError } = await supabase.from("flows").insert({
    id: flowId,
    agent_id: agentId,
    name: template.name,
    order: maxOrder + 1,
    is_default: false,
  })
  if (flowError) throw flowError

  const stageRows = templateStages.map((s, i) => ({
    id: crypto.randomUUID(),
    flow_id: flowId,
    name: s.name,
    order: s.sort_order,
    color_key: s.color,
  }))

  const { error: insertStagesError } = await supabase.from("stages").insert(stageRows)
  if (insertStagesError) {
    await supabase.from("flows").delete().eq("id", flowId).eq("agent_id", agentId)
    throw insertStagesError
  }

  return { flowId }
}
