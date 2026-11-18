import { claimDraftForSend, updateDraftSendResult } from './db/mail-drafts'
import { sendReply, findMessageRef } from './hostinger-client'
import { isAllowedRecipient } from './policy'
import { recordAuditEvent } from './db/mail-audit-events'
import { getEventById } from './db/mail-events'
import { notifyAdmin } from './notify'
import { buildReplyHtml } from './email-signature'

export async function sendDraft(
  draftId: string
): Promise<{ outcome: 'sent' | 'failed' | 'unknown' | 'already-claimed' | 'not-approved' }> {
  const claimed = await claimDraftForSend(draftId)
  if (claimed === 'already-claimed') {
    return { outcome: 'already-claimed' }
  }

  const sourceEvent = await getEventById(claimed.mailEventId)
  if (!sourceEvent) {
    await updateDraftSendResult(draftId, { status: 'SEND_FAILED' })
    await recordAuditEvent({ actor: 'system', action: 'SEND_DRAFT', targetType: 'mail_draft', targetId: draftId, outcome: 'SOURCE_EVENT_MISSING' })
    await notifyAdmin(
      `Draft send failed — source event missing`,
      `Draft ${draftId} references mail event ${claimed.mailEventId}, which no longer exists. The send was blocked. Check the dashboard.`
    )
    return { outcome: 'failed' }
  }

  // Compares the draft's stored sender against the sender captured directly
  // from the webhook payload at claim time — two independent sources — so
  // this can actually catch a draft whose recipient drifted from the real
  // original sender during processing. (Previously compared
  // claimed.senderAddress to itself, which could never fail.)
  if (!isAllowedRecipient(claimed.senderAddress, { originalSenderAddress: sourceEvent.senderAddress })) {
    await updateDraftSendResult(draftId, { status: 'SEND_FAILED' })
    await recordAuditEvent({ actor: 'system', action: 'SEND_DRAFT', targetType: 'mail_draft', targetId: draftId, outcome: 'BLOCKED_BY_POLICY' })
    await notifyAdmin(
      `Draft send BLOCKED by policy — recipient mismatch`,
      `Draft ${draftId}'s stored sender (${claimed.senderAddress}) doesn't match the source event's sender (${sourceEvent.senderAddress}). The send was blocked as a security measure. This may indicate a data integrity issue — check the dashboard.`
    )
    return { outcome: 'failed' }
  }

  const textBody = claimed.editedReply ?? claimed.proposedReply
  // Threading (inReplyTo) is best-effort: the webhook never gives us the
  // message's IMAP uid, only its Message-ID, so it must be resolved via a
  // folder search. A miss just means the reply sends untethered rather than
  // visually threaded — never blocks the send.
  const inReplyTo = await findMessageRef(
    sourceEvent.mailboxResourceId,
    sourceEvent.folder,
    sourceEvent.messageId,
    sourceEvent.receivedAt
  )
  const result = await sendReply(sourceEvent.mailboxResourceId, {
    to: claimed.senderAddress,
    subject: claimed.proposedSubject,
    textBody,
    htmlBody: buildReplyHtml(textBody),
    inReplyTo,
  })

  const statusMap = { sent: 'SENT', failed: 'SEND_FAILED', unknown: 'SEND_STATUS_UNKNOWN' } as const
  await updateDraftSendResult(draftId, {
    status: statusMap[result.outcome],
    sentAt: result.outcome === 'sent' ? new Date().toISOString() : undefined,
  })
  await recordAuditEvent({
    actor: 'system', action: 'SEND_DRAFT', targetType: 'mail_draft', targetId: draftId,
    outcome: statusMap[result.outcome],
  })

  if (result.outcome !== 'sent') {
    await notifyAdmin(
      `Draft send ${result.outcome === 'failed' ? 'FAILED' : 'status unknown'} — ${claimed.senderAddress}`,
      `Draft ${draftId} (to ${claimed.senderAddress}) did not confirm as sent — outcome: ${statusMap[result.outcome]}. Check the dashboard; a status-unknown send may still have gone through.`
    )
  }

  return { outcome: result.outcome }
}
