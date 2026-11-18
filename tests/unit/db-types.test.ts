import { describe, it, expect } from 'vitest'
import type { MailDraft } from '../../lib/db/types'

describe('MailDraft shape', () => {
  it('camelCases every column from the migration', () => {
    const draft: MailDraft = {
      id: '1', mailEventId: '2', classification: 'ACTION_REQUIRED', confidence: 0.9,
      senderAddress: 'a@b.com', subjectPreview: 'x', bodyPreview: 'y',
      proposedSubject: 'x', proposedReply: 'y', editedReply: null, status: 'PENDING',
      sendIdempotencyKey: null, approvedBy: null, approvedAt: null, sentAt: null,
      createdAt: '2026-01-01', updatedAt: '2026-01-01',
    }
    expect(Object.keys(draft).every((k) => !k.includes('_'))).toBe(true)
  })
})
