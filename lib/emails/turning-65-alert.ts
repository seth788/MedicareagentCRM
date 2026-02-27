import { getAppUrl } from "./soa"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export interface Turning65Client {
  name: string
  turning65Date: string
  daysAway: number
  clientUrl: string
}

export function turning65AlertHtml(params: {
  agentName: string
  clients: Turning65Client[]
  dashboardUrl: string
}): string {
  const { agentName, clients, dashboardUrl } = params
  const rows = clients
    .map(
      (c) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(c.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(c.turning65Date)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${c.daysAway} days</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;"><a href="${escapeHtml(c.clientUrl)}">View</a></td>
        </tr>`
    )
    .join("")
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:24px;">
  <p>Hi ${escapeHtml(agentName)},</p>
  <p>Here are your clients turning 65 in the next 90 days:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px 12px;text-align:left;">Client</th>
        <th style="padding:8px 12px;text-align:left;">Turning 65</th>
        <th style="padding:8px 12px;text-align:left;">Days away</th>
        <th style="padding:8px 12px;"></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin:24px 0;">
    <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#2563eb;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;">View Dashboard</a>
  </p>
</body>
</html>
`
}

export function turning65AlertText(params: {
  agentName: string
  clients: Turning65Client[]
  dashboardUrl: string
}): string {
  const { agentName, clients, dashboardUrl } = params
  const lines = clients.map(
    (c) => `  - ${c.name}: ${c.turning65Date} (${c.daysAway} days) — ${c.clientUrl}`
  )
  return `Hi ${agentName},

Clients turning 65 in the next 90 days:

${lines.join("\n")}

View dashboard: ${dashboardUrl}`
}
