import { NewsletterWelcomeEmail } from "@/components/emails/newsletter-welcome-email"
import { OTPEmail } from "@/components/emails/otp-email"
import React from "react"
import { Resend } from "resend"
import config from "./config"

export const resend = config.email.apiKey ? new Resend(config.email.apiKey) : null

export async function sendOTPCodeEmail({ email, otp }: { email: string; otp: string }) {
  const html = React.createElement(OTPEmail, { otp })

  if (!resend) return { data: null, error: { message: "Email not configured" } }
  return await resend.emails.send({
    from: config.email.from,
    to: email,
    subject: "Your TaxHacker verification code",
    react: html,
  })
}

export async function sendNewsletterWelcomeEmail(email: string) {
  if (!resend) return { data: null, error: { message: "Email not configured" } }
  const html = React.createElement(NewsletterWelcomeEmail)

  return await resend.emails.send({
    from: config.email.from,
    to: email,
    subject: "Welcome to TaxHacker Newsletter!",
    react: html,
  })
}
