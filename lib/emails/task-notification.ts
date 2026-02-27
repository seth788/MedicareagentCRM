import { getAppUrl } from "./soa"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function taskNotificationHtml(params: {
  taskTitle: string
  relatedName: string
  relatedType: "Client" | "Lead"
  dueAtFormatted: string
  description?: string
  taskUrl: string
}): string {
  const { taskTitle, relatedName, relatedType, dueAtFormatted, description, taskUrl } = params
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p>This is a reminder for your scheduled task.</p>
  <p><strong>${escapeHtml(taskTitle)}</strong></p>
  <p><strong>${escapeHtml(relatedType)}:</strong> ${escapeHtml(relatedName)}</p>
  <p><strong>Due:</strong> ${escapeHtml(dueAtFormatted)}</p>
  ${description ? `<p>${escapeHtml(description)}</p>` : ""}
  <p style="margin:32px 0;">
    <a href="${escapeHtml(taskUrl)}" style="display:inline-block;background:#2563eb;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;">View Task</a>
  </p>
</body>
</html>
`
}

export function taskNotificationText(params: {
  taskTitle: string
  relatedName: string
  relatedType: "Client" | "Lead"
  dueAtFormatted: string
  description?: string
  taskUrl: string
}): string {
  const { taskTitle, relatedName, relatedType, dueAtFormatted, description, taskUrl } = params
  return `Task reminder: ${taskTitle}

${relatedType}: ${relatedName}
Due: ${dueAtFormatted}
${description ? `\n${description}\n` : ""}
View task: ${taskUrl}`
}
