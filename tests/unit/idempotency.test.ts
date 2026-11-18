import { describe, it, expect, vi } from 'vitest'

vi.mock('../../lib/db/mail-events', () => ({
  insertClaimedEvent: vi.fn(),
  getEventByProviderId: vi.fn(),
}))

import { insertClaimedEvent, getEventByProviderId } from '../../lib/db/mail-events'
import { claimWebhookEvent } from '../../lib/idempotency'
import { HostingerWebhookPayload } from '../../lib/webhook-schema'

const PAYLOAD: HostingerWebhookPayload = {
  id: 'evt_1',
  event: 'message.received',
  timestamp: '2026-09-01T00:00:00Z',
  data: {
    eventId: 'hash_1',
    mailboxAddress: 'a@b.com',
    messageId: 'MSG_1',
    from: 'Sender <sender@example.com>',
    subject: 's',
    date: '2026-09-01T00:00:00Z',
    bodyUrl: 'https://storage.googleapis.com/bucket/body.json',
  },
}

describe('claimWebhookEvent', () => {
  it('returns claimed on first delivery', async () => {
    const fakeEvent = { id: 'row_1' } as any
    vi.mocked(insertClaimedEvent).mockResolvedValue(fakeEvent)
    const result = await claimWebhookEvent(PAYLOAD, 'hash1')
    expect(result).toEqual({ outcome: 'claimed', event: fakeEvent })
  })

  it('returns duplicate on retry, using the existing row', async () => {
    vi.mocked(insertClaimedEvent).mockResolvedValue('duplicate')
    const existing = { id: 'row_1' } as any
    vi.mocked(getEventByProviderId).mockResolvedValue(existing)
    const result = await claimWebhookEvent(PAYLOAD, 'hash1')
    expect(result).toEqual({ outcome: 'duplicate', event: existing })
  })

  it('throws if marked duplicate but the row cannot be found (data integrity failure)', async () => {
    vi.mocked(insertClaimedEvent).mockResolvedValue('duplicate')
    vi.mocked(getEventByProviderId).mockResolvedValue(null)
    await expect(claimWebhookEvent(PAYLOAD, 'hash1')).rejects.toThrow()
  })
})
