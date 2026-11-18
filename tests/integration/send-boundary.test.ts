import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/db/mail-drafts', () => ({
  claimDraftForSend: vi.fn(),
  updateDraftSendResult: vi.fn(),
  getDraftById: vi.fn(),
}))
vi.mock('../../lib/db/mail-events', () => ({ getEventById: vi.fn() }))
vi.mock('../../lib/hostinger-client', () => ({ sendReply: vi.fn(), findMessageRef: vi.fn() }))
vi.mock('../../lib/db/mail-audit-events', () => ({ recordAuditEvent: vi.fn() }))
vi.mock('../../lib/notify', () => ({ notifyAdmin: vi.fn() }))
// lib/policy is intentionally NOT mocked here — these tests exercise the
// real isAllowedRecipient comparison to prove the send boundary's policy
// check actually blocks a mismatch, not just that it's called.

import { claimDraftForSend, updateDraftSendResult } from '../../lib/db/mail-drafts'
import { getEventById } from '../../lib/db/mail-events'
import { sendReply, findMessageRef } from '../../lib/hostinger-client'
import { notifyAdmin } from '../../lib/notify'
import { sendDraft } from '../../lib/send-draft'

const CLAIMED_DRAFT = {
  id: 'draft_1', mailEventId: 'event_1', classification: 'ACTION_REQUIRED', confidence: 0.9,
  senderAddress: 'a@b.com', subjectPreview: 's', bodyPreview: 'b',
  proposedSubject: 'Re: s', proposedReply: 'Reply body', editedReply: null, status: 'APPROVED',
  sendIdempotencyKey: 'key_1', approvedBy: 'yassine-emhamed', approvedAt: 'x', sentAt: null,
  createdAt: 'x', updatedAt: 'x',
} as any

const SOURCE_EVENT = {
  id: 'event_1', mailboxResourceId: 'MB_1', folder: 'INBOX', messageId: 'MSG_1',
  senderAddress: 'a@b.com', providerEventId: 'p1', payloadHash: 'h', receivedAt: 'x',
  state: 'DRAFTED', errorCode: null, createdAt: 'x', updatedAt: 'x',
} as any

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getEventById).mockResolvedValue(SOURCE_EVENT)
  vi.mocked(findMessageRef).mockResolvedValue(null)
})

describe('sendDraft', () => {
  it('returns already-claimed without calling the send API when the claim race is lost', async () => {
    vi.mocked(claimDraftForSend).mockResolvedValue('already-claimed')
    const result = await sendDraft('draft_1')
    expect(result).toEqual({ outcome: 'already-claimed' })
    expect(sendReply).not.toHaveBeenCalled()
  })

  it('sends and records SENT on success, without notifying the admin', async () => {
    vi.mocked(claimDraftForSend).mockResolvedValue(CLAIMED_DRAFT)
    vi.mocked(sendReply).mockResolvedValue({ outcome: 'sent' })
    const result = await sendDraft('draft_1')
    expect(result).toEqual({ outcome: 'sent' })
    expect(updateDraftSendResult).toHaveBeenCalledWith('draft_1', expect.objectContaining({ status: 'SENT' }))
    expect(notifyAdmin).not.toHaveBeenCalled()
  })

  it('records SEND_STATUS_UNKNOWN, does not retry automatically, and notifies the admin', async () => {
    vi.mocked(claimDraftForSend).mockResolvedValue(CLAIMED_DRAFT)
    vi.mocked(sendReply).mockResolvedValue({ outcome: 'unknown' })
    const result = await sendDraft('draft_1')
    expect(result).toEqual({ outcome: 'unknown' })
    expect(updateDraftSendResult).toHaveBeenCalledWith('draft_1', expect.objectContaining({ status: 'SEND_STATUS_UNKNOWN' }))
    expect(notifyAdmin).toHaveBeenCalledTimes(1)
  })

  it('uses the editedReply body when present, not the original proposedReply', async () => {
    vi.mocked(claimDraftForSend).mockResolvedValue({ ...CLAIMED_DRAFT, editedReply: 'Edited body' })
    vi.mocked(sendReply).mockResolvedValue({ outcome: 'sent' })
    await sendDraft('draft_1')
    expect(sendReply).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ textBody: 'Edited body' }))
  })

  it('sends via the source event mailbox, not the draft id', async () => {
    vi.mocked(claimDraftForSend).mockResolvedValue(CLAIMED_DRAFT)
    vi.mocked(sendReply).mockResolvedValue({ outcome: 'sent' })
    await sendDraft('draft_1')
    expect(sendReply).toHaveBeenCalledWith('MB_1', expect.objectContaining({ to: 'a@b.com' }))
  })

  it('includes a signed HTML body alongside the plain text', async () => {
    vi.mocked(claimDraftForSend).mockResolvedValue(CLAIMED_DRAFT)
    vi.mocked(sendReply).mockResolvedValue({ outcome: 'sent' })
    await sendDraft('draft_1')
    expect(sendReply).toHaveBeenCalledWith(
      'MB_1',
      expect.objectContaining({ htmlBody: expect.stringContaining('yassine-emhamed-headshot.webp') })
    )
  })

  it('threads the reply when a source message ref is found', async () => {
    vi.mocked(claimDraftForSend).mockResolvedValue(CLAIMED_DRAFT)
    vi.mocked(sendReply).mockResolvedValue({ outcome: 'sent' })
    vi.mocked(findMessageRef).mockResolvedValue({ uid: 42, folder: 'INBOX' })
    await sendDraft('draft_1')
    expect(sendReply).toHaveBeenCalledWith('MB_1', expect.objectContaining({ inReplyTo: { uid: 42, folder: 'INBOX' } }))
  })

  it('sends untethered (no inReplyTo) when the source message ref cannot be resolved', async () => {
    vi.mocked(claimDraftForSend).mockResolvedValue(CLAIMED_DRAFT)
    vi.mocked(sendReply).mockResolvedValue({ outcome: 'sent' })
    vi.mocked(findMessageRef).mockResolvedValue(null)
    await sendDraft('draft_1')
    expect(sendReply).toHaveBeenCalledWith('MB_1', expect.objectContaining({ inReplyTo: null }))
  })

  it('blocks and never calls sendReply when the draft sender diverges from the source event sender, and notifies the admin', async () => {
    vi.mocked(claimDraftForSend).mockResolvedValue(CLAIMED_DRAFT)
    vi.mocked(getEventById).mockResolvedValue({ ...SOURCE_EVENT, senderAddress: 'someone-else@evil.com' })
    const result = await sendDraft('draft_1')
    expect(result).toEqual({ outcome: 'failed' })
    expect(sendReply).not.toHaveBeenCalled()
    expect(updateDraftSendResult).toHaveBeenCalledWith('draft_1', expect.objectContaining({ status: 'SEND_FAILED' }))
    expect(notifyAdmin).toHaveBeenCalledTimes(1)
    expect(notifyAdmin).toHaveBeenCalledWith(expect.stringContaining('BLOCKED'), expect.any(String))
  })
})
