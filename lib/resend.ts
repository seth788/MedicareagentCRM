import { Resend } from "resend"

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

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM

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
