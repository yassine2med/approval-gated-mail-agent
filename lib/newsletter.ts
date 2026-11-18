import { createHmac, timingSafeEqual } from 'node:crypto'
import { getResendClient } from './resend'
import { env } from './env'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONFIRM_TOKEN_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours
const PORTFOLIO_ORIGIN = 'https://yassine-emhamed.net'
const CONFIRM_BASE_URL = 'https://hostinger-mail-agent-yassine2meds-projects.vercel.app/api/newsletter/confirm'

export type SubscribeResult =
  | { outcome: 'pending' } // contact created (or re-sent), confirmation email out
  | { outcome: 'already-subscribed' }
  | { outcome: 'invalid-email' }
  | { outcome: 'failed'; message: string }

export type ConfirmResult = 'confirmed' | 'invalid' | 'expired' | 'failed'

/**
 * Signs {email, expiresAt} with an HMAC so confirmation doesn't need its own
 * storage — everything needed to verify the link is in the link itself. Not
 * a capability token beyond "confirm this one subscription": the signed
 * payload only ever flips one contact's unsubscribed flag to false.
 */
function signConfirmToken(email: string, expiresAt: number): string {
  return createHmac('sha256', env.NEWSLETTER_CONFIRM_SECRET)
    .update(`${email.toLowerCase()}:${expiresAt}`)
    .digest('hex')
}

function buildConfirmUrl(email: string): string {
  const expiresAt = Date.now() + CONFIRM_TOKEN_TTL_MS
  const token = signConfirmToken(email, expiresAt)
  const params = new URLSearchParams({ email, exp: String(expiresAt), token })
  return `${CONFIRM_BASE_URL}?${params.toString()}`
}

async function sendConfirmationEmail(email: string): Promise<void> {
  const confirmUrl = buildConfirmUrl(email)
  await getResendClient().emails.send({
    from: 'Yassine Emhamed <newsletter@yassine-emhamed.net>',
    to: email,
    subject: 'Confirm your subscription to Build Notes',
    text: `Confirm your subscription to Build Notes by clicking this link: ${confirmUrl}\n\nIf you didn't request this, ignore this email — you won't be subscribed unless you click the link.`,
    html: `
<div style="font-family: -apple-system, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a;">
  <p>One more step — confirm you'd like to receive <strong>Build Notes</strong>, occasional write-ups on systems, AI workflows, and gov-scale ops from Yassine Emhamed.</p>
  <p><a href="${confirmUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Confirm subscription</a></p>
  <p style="color: #666; font-size: 12px;">If you didn't request this, you can ignore this email — you won't be subscribed unless you click the link above. This link expires in 48 hours.</p>
</div>
`.trim(),
  })
}

/** Step 1 of double opt-in: creates (or re-flags) the contact as pending and emails a confirmation link. Never activates the subscription on its own. */
export async function subscribeToNewsletter(email: string): Promise<SubscribeResult> {
  const trimmed = email.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(trimmed)) {
    return { outcome: 'invalid-email' }
  }

  const existing = await getResendClient().contacts.get({ email: trimmed, audienceId: env.RESEND_AUDIENCE_ID })

  if (existing.data && existing.data.unsubscribed === false) {
    // Already a confirmed, active subscriber — don't re-send or reset anything.
    return { outcome: 'already-subscribed' }
  }

  if (!existing.data) {
    const { error } = await getResendClient().contacts.create({
      email: trimmed,
      audienceId: env.RESEND_AUDIENCE_ID,
      unsubscribed: true, // stays excluded from broadcasts until confirmed
    })
    if (error) {
      return { outcome: 'failed', message: error.message }
    }
  }
  // else: contact exists but unsubscribed — leave the flag as-is, just resend the confirmation link.

  try {
    await sendConfirmationEmail(trimmed)
  } catch (error) {
    return { outcome: 'failed', message: error instanceof Error ? error.message : 'UNKNOWN_ERROR' }
  }

  return { outcome: 'pending' }
}

/** Step 2 of double opt-in: verifies the signed link and, only then, flips the contact to actively subscribed. */
export async function confirmNewsletterSubscription(
  email: string,
  token: string,
  expiresAtRaw: string
): Promise<ConfirmResult> {
  const expiresAt = Number(expiresAtRaw)
  if (!email || !token || !Number.isFinite(expiresAt)) {
    return 'invalid'
  }

  const expected = signConfirmToken(email, expiresAt)
  const providedBuf = Buffer.from(token)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return 'invalid'
  }

  if (Date.now() > expiresAt) {
    return 'expired'
  }

  const { error } = await getResendClient().contacts.update({
    email: email.toLowerCase(),
    audienceId: env.RESEND_AUDIENCE_ID,
    unsubscribed: false,
  })
  if (error) {
    return 'failed'
  }

  return 'confirmed'
}

export { PORTFOLIO_ORIGIN }
