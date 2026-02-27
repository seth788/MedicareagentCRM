/** Base URL for the app (SOA links, client profile links) */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  )
}

export function soaRequestToClientHtml(params: {
  clientFirstName: string
  agentName: string
  agentPhone: string
  signUrl: string
}): string {
  const { clientFirstName, agentName, agentPhone, signUrl } = params
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${escapeHtml(clientFirstName)},</p>
  <p>Before your Medicare appointment, we need you to review and sign a <strong>Scope of Appointment (SOA)</strong> form. This document lets us know which products you'd like to discuss.</p>
  <p>Your agent <strong>${escapeHtml(agentName)}</strong> is ready to meet with you. If you have questions, call ${escapeHtml(agentPhone || "your agent")}.</p>
  <p style="margin:32px 0;">
    <a href="${escapeHtml(signUrl)}" style="display:inline-block;background:#2563eb;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Review & Sign Your Scope of Appointment</a>
  </p>
  <p style="font-size:13px;color:#666;">
    <strong>Important:</strong> The Centers for Medicare and Medicaid Services requires agents to document the scope of a marketing appointment prior to any individual sales meeting. All information provided is confidential. This link expires in 72 hours.
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#888;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${escapeHtml(signUrl)}" style="word-break:break-all;">${escapeHtml(signUrl)}</a></p>
</body>
</html>
`
}

export function soaRequestToClientText(params: {
  clientFirstName: string
  agentName: string
  agentPhone: string
  signUrl: string
}): string {
  const { clientFirstName, agentName, agentPhone, signUrl } = params
  return `Hi ${clientFirstName},

Before your Medicare appointment, we need you to review and sign a Scope of Appointment (SOA) form. This document lets us know which products you'd like to discuss.

Your agent ${agentName} is ready to meet with you. If you have questions, call ${agentPhone || "your agent"}.

Sign here: ${signUrl}

Important: The Centers for Medicare and Medicaid Services requires agents to document the scope of a marketing appointment prior to any individual sales meeting. All information provided is confidential. This link expires in 72 hours.`
}

export function soaAgentNotificationHtml(params: {
  clientName: string
  productsSelected: string[]
  signedAt: string
  profileUrl: string
}): string {
  const { clientName, productsSelected, signedAt, profileUrl } = params
  const productsList =
    productsSelected.length > 0
      ? productsSelected.join(", ")
      : "No products selected"
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p><strong>${escapeHtml(clientName)}</strong> has signed their Scope of Appointment and is ready for your countersignature.</p>
  <p><strong>Products selected:</strong> ${escapeHtml(productsList)}</p>
  <p><strong>Signed:</strong> ${escapeHtml(signedAt)}</p>
  <p style="margin:32px 0;">
    <a href="${escapeHtml(profileUrl)}" style="display:inline-block;background:#2563eb;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Review & Countersign</a>
  </p>
</body>
</html>
`
}

export function soaAgentNotificationText(params: {
  clientName: string
  productsSelected: string[]
  signedAt: string
  profileUrl: string
}): string {
  const { clientName, productsSelected, signedAt, profileUrl } = params
  const productsList =
    productsSelected.length > 0
      ? productsSelected.join(", ")
      : "No products selected"
  return `${clientName} has signed their Scope of Appointment.

Products selected: ${productsList}
Signed: ${signedAt}

Countersign here: ${profileUrl}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
