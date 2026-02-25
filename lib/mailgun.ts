import FormData from "form-data"
import Mailgun from "mailgun.js"

export interface SendEmailOptions {
  to: string[]
  subject: string
  text: string
  html?: string
}

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, text, html } = options

  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  const from = process.env.MAILGUN_FROM

  if (!apiKey || !domain || !from) {
    return {
      ok: false,
      error: "Missing Mailgun config: set MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAILGUN_FROM in .env.local",
    }
  }

  const mailgun = new Mailgun(FormData)
  const mg = mailgun.client({
    username: "api",
    key: apiKey,
    ...(process.env.MAILGUN_EU === "true" && { url: "https://api.eu.mailgun.net" }),
  })

  try {
    const data = await mg.messages.create(domain, {
      from,
      to,
      subject,
      text,
      ...(html && { html }),
    })

    const id = (data as { id?: string }).id
    return { ok: true, id }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}
