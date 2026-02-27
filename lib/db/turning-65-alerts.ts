import type { SupabaseClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/resend"
import { getAppUrl } from "@/lib/emails/soa"
import {
  turning65AlertHtml,
  turning65AlertText,
  type Turning65Client,
} from "@/lib/emails/turning-65-alert"
import { getT65FromDob, parseLocalDate } from "@/lib/date-utils"
import { format, differenceInDays } from "date-fns"

const FROM_EMAIL = "notifications@advantacrm.com"

/**
 * Send daily turning 65 digest to agents who have turning_65_alerts enabled.
 */
export async function runTurning65AlertsCron(
  supabase: SupabaseClient
): Promise<{ sent: number; errors: string[] }> {
  const { data: optedInAgents, error: agentError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, display_name")
    .or("turning_65_alerts.eq.true,turning_65_alerts.is.null")
  if (agentError) throw agentError
  const agents = optedInAgents ?? []
  if (agents.length === 0) return { sent: 0, errors: [] }

  const { data: agentUsers } = await Promise.all(
    agents.map((a) => supabase.auth.admin.getUserById(a.id))
  )
  const agentEmailMap = new Map<string, string>()
  agents.forEach((a, i) => {
    const email = agentUsers[i]?.data?.user?.email
    if (email) agentEmailMap.set(a.id, email)
  })

  const now = new Date()
  const in90 = new Date(now)
  in90.setDate(in90.getDate() + 90)

  const appUrl = getAppUrl()
  const errors: string[] = []
  let sent = 0

  for (const agent of agents) {
    const email = agentEmailMap.get(agent.id)
    if (!email) {
      errors.push(`Agent ${agent.id}: No email`)
      continue
    }

    const { data: clientRows, error: clientError } = await supabase
      .from("clients")
      .select("id, first_name, last_name, dob")
      .eq("agent_id", agent.id)
    if (clientError) {
      errors.push(`Agent ${agent.id}: ${clientError.message}`)
      continue
    }

    const clientsTurning65: Turning65Client[] = []
    for (const c of clientRows ?? []) {
      const t65Str = getT65FromDob(c.dob)
      const t65 = parseLocalDate(t65Str)
      if (t65 >= now && t65 <= in90) {
        const days = differenceInDays(t65, now)
        clientsTurning65.push({
          name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Client",
          turning65Date: format(t65, "MMM d, yyyy"),
          daysAway: days,
          clientUrl: `${appUrl}/clients/${c.id}`,
        })
      }
    }
    clientsTurning65.sort((a, b) => a.daysAway - b.daysAway)

    const agentName =
      [agent.first_name, agent.last_name].filter(Boolean).join(" ").trim() ||
      agent.display_name ||
      "Agent"

    const result = await sendEmail({
      from: FROM_EMAIL,
      to: [email],
      subject:
        clientsTurning65.length > 0
          ? `Turning 65 Soon: ${clientsTurning65.length} client${clientsTurning65.length === 1 ? "" : "s"}`
          : "Turning 65 Soon: No clients in the next 90 days",
      fromName: "AdvantaCRM",
      text: turning65AlertText({
        agentName,
        clients: clientsTurning65,
        dashboardUrl: appUrl,
      }),
      html: turning65AlertHtml({
        agentName,
        clients: clientsTurning65,
        dashboardUrl: appUrl,
      }),
    })

    if (!result.ok) {
      errors.push(`Agent ${agent.id}: ${result.error}`)
    } else {
      sent++
    }
  }

  return { sent, errors }
}
