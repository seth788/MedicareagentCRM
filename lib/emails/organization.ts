import { sendEmail } from "@/lib/resend"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function sendOrganizationInvite(params: {
  toEmail: string
  orgName: string
  role: string
  inviteUrl: string
}) {
  const { toEmail, orgName, role, inviteUrl } = params
  const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const text = `You've been invited to join ${orgName} as a ${roleLabel}. Use the link below to accept: ${inviteUrl}`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p>You've been invited to join <strong>${escapeHtml(orgName)}</strong> as a ${escapeHtml(roleLabel)}.</p>
  <p><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Accept Invite</a></p>
  <p style="font-size:12px;color:#666;">Or copy this link: ${escapeHtml(inviteUrl)}</p>
</body>
</html>
`
  return sendEmail({
    to: [toEmail],
    subject: `You've been invited to join ${orgName}`,
    text,
    html,
  })
}

export async function sendMemberJoinedNotification(params: {
  toEmail: string
  agentName: string
  agentEmail: string
  orgName: string
  role: string
}) {
  const { toEmail, agentName, agentEmail, orgName, role } = params
  const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const text = `${agentName} (${agentEmail}) has joined ${orgName} as a ${roleLabel}. You can manage members in your agency dashboard.`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p><strong>${escapeHtml(agentName)}</strong> (${escapeHtml(agentEmail)}) has joined <strong>${escapeHtml(orgName)}</strong> as a ${escapeHtml(roleLabel)}.</p>
  <p>You can manage members in your agency dashboard.</p>
</body>
</html>
`
  return sendEmail({
    to: [toEmail],
    subject: `${agentName} has joined your agency`,
    text,
    html,
  })
}

export async function sendMemberRemovedNotification(params: {
  toEmail: string
  orgName: string
}) {
  const { toEmail, orgName } = params
  const text = `Your membership in ${orgName} has been ended. Your account and all your data remain intact.`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p>Your membership in <strong>${escapeHtml(orgName)}</strong> has been ended.</p>
  <p>Your account and all your data remain intact. If you believe this was a mistake, contact your agency administrator.</p>
</body>
</html>
`
  return sendEmail({
    to: [toEmail],
    subject: `You've been removed from ${orgName}`,
    text,
    html,
  })
}

export async function sendDashboardAccessGranted(params: {
  toEmail: string
  orgName: string
}) {
  const { toEmail, orgName } = params
  const text = `You've been granted dashboard access for ${orgName}. You can now access the agency dashboard from your main navigation.`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p>You've been granted dashboard access for <strong>${escapeHtml(orgName)}</strong>.</p>
  <p>You can now access the agency dashboard from your main navigation.</p>
</body>
</html>
`
  return sendEmail({
    to: [toEmail],
    subject: "You now have agency dashboard access",
    text,
    html,
  })
}

export async function sendDashboardAccessRevoked(params: {
  toEmail: string
  orgName: string
}) {
  const { toEmail, orgName } = params
  const text = `Your dashboard access for ${orgName} has been revoked.`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p>Your dashboard access for <strong>${escapeHtml(orgName)}</strong> has been revoked.</p>
</body>
</html>
`
  return sendEmail({
    to: [toEmail],
    subject: "Agency dashboard access revoked",
    text,
    html,
  })
}

export async function sendRoleChanged(params: {
  toEmail: string
  orgName: string
  oldRole: string
  newRole: string
}) {
  const { toEmail, orgName, oldRole, newRole } = params
  const oldLabel = oldRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const newLabel = newRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const text = `${orgName} has updated your role from ${oldLabel} to ${newLabel}.`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p><strong>${escapeHtml(orgName)}</strong> has updated your role from ${escapeHtml(oldLabel)} to ${escapeHtml(newLabel)}.</p>
</body>
</html>
`
  return sendEmail({
    to: [toEmail],
    subject: "Your agency role has been updated",
    text,
    html,
  })
}

export async function sendAgentTransferred(params: {
  toEmail: string
  oldAgencyName: string
  newAgencyName: string
  parentOrgName: string
}) {
  const { toEmail, oldAgencyName, newAgencyName, parentOrgName } = params
  const text = `You've been transferred from ${oldAgencyName} to ${newAgencyName} within ${parentOrgName}.`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p>You've been transferred from <strong>${escapeHtml(oldAgencyName)}</strong> to <strong>${escapeHtml(newAgencyName)}</strong> within ${escapeHtml(parentOrgName)}.</p>
</body>
</html>
`
  return sendEmail({
    to: [toEmail],
    subject: "You've been transferred to a new agency",
    text,
    html,
  })
}

export async function sendSubagencyInvite(params: {
  toEmail: string
  placementParentName: string
  inviteUrl: string
}) {
  const { toEmail, placementParentName, inviteUrl } = params
  const text = `Your request to create a subagency has been approved. Name your subagency and create it under ${placementParentName}: ${inviteUrl}`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p>Your request to create a subagency has been approved.</p>
  <p>Name your subagency and create it under <strong>${escapeHtml(placementParentName)}</strong>:</p>
  <p><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Create Subagency</a></p>
  <p style="font-size:12px;color:#666;">Or copy: ${escapeHtml(inviteUrl)}</p>
</body>
</html>
`
  return sendEmail({
    to: [toEmail],
    subject: "Subagency request approved",
    text,
    html,
  })
}

export async function sendSubagencyRequestDeclined(params: {
  toEmail: string
  agentName: string
  orgName: string
}) {
  const { toEmail, agentName, orgName } = params
  const text = `${agentName}, your request to create a subagency under ${orgName} has been declined. Contact your agency owner if you have questions.`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p>Your request to create a subagency under <strong>${escapeHtml(orgName)}</strong> has been declined.</p>
  <p>Contact your agency owner if you have questions.</p>
</body>
</html>
`
  return sendEmail({
    to: [toEmail],
    subject: "Subagency request declined",
    text,
    html,
  })
}

export async function sendSubAgencyCreated(params: {
  toEmail: string
  parentOrgName: string
  subAgencyName: string
}) {
  const { toEmail, parentOrgName, subAgencyName } = params
  const text = `${subAgencyName} has been created as a sub-agency under ${parentOrgName}.`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;">
  <p><strong>${escapeHtml(subAgencyName)}</strong> has been created as a sub-agency under ${escapeHtml(parentOrgName)}.</p>
</body>
</html>
`
  return sendEmail({
    to: [toEmail],
    subject: "New sub-agency created",
    text,
    html,
  })
}
