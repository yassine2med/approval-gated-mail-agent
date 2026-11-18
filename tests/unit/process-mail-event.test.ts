import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/db/mail-events', () => ({
  updateEventState: vi.fn(),
  getEventById: vi.fn(),
}))
vi.mock('../../lib/db/mail-drafts', () => ({ insertDraft: vi.fn() }))
vi.mock('../../lib/hostinger-client', () => ({ fetchMessageBody: vi.fn() }))
vi.mock('../../lib/classify', () => ({ classifyAndDraft: vi.fn() }))
vi.mock('../../lib/notify', () => ({ notifyAdmin: vi.fn() }))

import { updateEventState, getEventById } from '../../lib/db/mail-events'
import { insertDraft } from '../../lib/db/mail-drafts'
import { fetchMessageBody } from '../../lib/hostinger-client'
import { classifyAndDraft } from '../../lib/classify'
import { notifyAdmin } from '../../lib/notify'
import { runMailEventProcessing, mailEventWorkflow } from '../../lib/workflow/process-mail-event'

const EVENT = {
  id: 'row_1', mailboxResourceId: 'MB_1', folder: 'INBOX', messageId: 'MSG_1',
  senderAddress: 'a@b.com', providerEventId: 'p1', payloadHash: 'h', receivedAt: '2026-09-01T00:00:00Z',
  bodyUrl: 'https://storage.googleapis.com/bucket/body.json', subject: 'Hi',
  state: 'CLAIMED', errorCode: null, createdAt: 'x', updatedAt: 'x',
} as any

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getEventById).mockResolvedValue(EVENT)
  vi.mocked(fetchMessageBody).mockResolvedValue({ plainText: 'Body', html: '<p>Body</p>' })
  vi.mocked(classifyAndDraft).mockResolvedValue({
    classification: 'INFORMATIONAL', confidence: 0.7, rationale: 'fyi',
    proposedSubject: 'Re: Hi', proposedReply: 'Thanks for the update.',
  } as any)
  vi.mocked(insertDraft).mockResolvedValue({ id: 'draft_1' } as any)
})

describe('runMailEventProcessing', () => {
  it('marks the event PROCESSING then DRAFTED and inserts one draft', async () => {
    await runMailEventProcessing(EVENT)
    expect(updateEventState).toHaveBeenCalledWith('row_1', 'PROCESSING')
    expect(updateEventState).toHaveBeenCalledWith('row_1', 'DRAFTED')
    expect(insertDraft).toHaveBeenCalledTimes(1)
  })

  it('marks the event FAILED with a code on classification failure, without inserting a draft', async () => {
    vi.mocked(classifyAndDraft).mockRejectedValue(new Error('model error'))
    await expect(runMailEventProcessing(EVENT)).rejects.toThrow()
    expect(updateEventState).toHaveBeenCalledWith('row_1', 'FAILED', expect.any(String))
    expect(insertDraft).not.toHaveBeenCalled()
  })
})

describe('mailEventWorkflow', () => {
  it('does not notify the admin on success', async () => {
    await mailEventWorkflow('row_1')
    expect(notifyAdmin).not.toHaveBeenCalled()
  })

  it('notifies the admin exactly once when processing fails', async () => {
    vi.mocked(classifyAndDraft).mockRejectedValue(new Error('model error'))
    await expect(mailEventWorkflow('row_1')).rejects.toThrow()
    expect(notifyAdmin).toHaveBeenCalledTimes(1)
    expect(notifyAdmin).toHaveBeenCalledWith(expect.stringContaining('failed to process'), expect.stringContaining('model error'))
  })
})
