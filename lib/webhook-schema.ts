import { z } from 'zod'
import { createHash } from 'node:crypto'

// Matches the real payload Hostinger sends (confirmed against live traffic —
// see app/api/webhooks/hostinger-mail/route.ts history), not the shape
// assumed during initial design. Notable divergences from that assumption:
// - `event` is a bare string, not { id, type, createdAt }.
// - The provider event id is top-level `id` (stable across delivery retries).
// - `data.from` is a full "Display Name <email>" header, not a bare address.
// - `data.mailboxAddress` is an email string; the opaque mailboxResourceId
//   the REST API needs must be resolved separately (see lib/mailbox-registry.ts).
// - No `folder` is provided; incoming mail always lands in INBOX.
// - Body content is truncated inline (`plainBody`/`htmlBody`); the full body
//   is fetched from `bodyUrl`, a short-lived signed URL, during processing.
export const HostingerWebhookPayload = z.object({
  id: z.string().min(1),
  event: z.literal('message.received'),
  timestamp: z.string().min(1),
  data: z.object({
    eventId: z.string().min(1),
    mailboxAddress: z.string().email(),
    messageId: z.string().min(1),
    from: z.string().min(1),
    subject: z.string(),
    date: z.string().min(1),
    bodyUrl: z.string().url(),
  }),
})

export type HostingerWebhookPayload = z.infer<typeof HostingerWebhookPayload>

export function parseWebhookPayload(
  json: unknown
): { ok: true; data: HostingerWebhookPayload } | { ok: false; code: string } {
  const result = HostingerWebhookPayload.safeParse(json)
  if (!result.success) return { ok: false, code: 'INVALID_WEBHOOK_PAYLOAD' }
  return { ok: true, data: result.data }
}

/** Pulls the bare address out of a "Display Name <email>" header, or returns the input unchanged if it's already bare. */
export function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/)
  return (match ? match[1] : fromHeader).trim().toLowerCase()
}

/** Stable event identity derived from the provider's own delivery id + immutable message id — used as the idempotency key, independent of mutable fields like subject. Hostinger reuses the same top-level `id` across retries of the same delivery, which is exactly what we want here. */
export function deriveEventIdentity(payload: HostingerWebhookPayload): string {
  const raw = `${payload.event}:${payload.id}:${payload.data.messageId}`
  return createHash('sha256').update(raw).digest('hex')
}
