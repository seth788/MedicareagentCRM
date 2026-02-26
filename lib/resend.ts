import { Resend } from "resend"

export interface SendEmailOptions {
  to: string[]
  subject: string
  text: string
  html?: string
  from?: string
  /** Override the display name only; email address comes from RESEND_FROM or from */
  fromName?: string
  replyTo?: string | string[]
}

/** Extract email address from "Name <email>" or return as-is if plain email */
function getEmailFromAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1].trim() : from.trim()
}

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, text, html, from: fromOverride, fromName, replyTo } = options

  const apiKey = process.env.RESEND_API_KEY
  const baseFrom = fromOverride ?? process.env.RESEND_FROM
  const email = baseFrom ? getEmailFromAddress(baseFrom) : ""
  const from = baseFrom
    ? fromName
      ? `${fromName} <${email}>`
      : baseFrom
    : ""

  if (!apiKey || !from) {
    return {
      ok: false,
      error:
        "Missing Resend config: set RESEND_API_KEY and RESEND_FROM in .env.local. Get an API key at https://resend.com/api-keys",
    }
  }

  const resend = new Resend(apiKey)

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      text,
      ...(html && { html }),
      ...(replyTo && { replyTo }),
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true, id: data?.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}
