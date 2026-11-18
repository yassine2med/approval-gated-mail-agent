import { insertClaimedEvent, getEventByProviderId } from './db/mail-events'
import { deriveEventIdentity, extractEmailAddress, type HostingerWebhookPayload } from './webhook-schema'
import { resolveMailboxResourceId } from './mailbox-registry'
import type { MailEvent } from './db/types'

export async function claimWebhookEvent(
  payload: HostingerWebhookPayload,
  payloadHash: string
): Promise<{ outcome: 'claimed'; event: MailEvent } | { outcome: 'duplicate'; event: MailEvent }> {
  const providerEventId = deriveEventIdentity(payload)
  const mailboxResourceId = resolveMailboxResourceId(payload.data.mailboxAddress)
  const result = await insertClaimedEvent({
    providerEventId,
    payloadHash,
    mailboxResourceId,
    folder: 'INBOX', // real webhook payloads don't report a folder; incoming mail always lands here
    messageId: payload.data.messageId,
    senderAddress: extractEmailAddress(payload.data.from),
    receivedAt: payload.data.date,
    bodyUrl: payload.data.bodyUrl,
    subject: payload.data.subject,
  })

  if (result !== 'duplicate') {
    return { outcome: 'claimed', event: result }
  }

  const existing = await getEventByProviderId(providerEventId)
  if (!existing) {
    throw new Error(`Event ${providerEventId} reported as duplicate but no row found`)
  }
  return { outcome: 'duplicate', event: existing }
}
