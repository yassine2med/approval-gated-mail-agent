import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/idempotency', () => ({ claimWebhookEvent: vi.fn() }))
vi.mock('../../lib/workflow/process-mail-event', () => ({ startMailEventWorkflow: vi.fn() }))
vi.mock('../../lib/notify', () => ({ notifyAdmin: vi.fn() }))

import { claimWebhookEvent } from '../../lib/idempotency'
import { notifyAdmin } from '../../lib/notify'
import { POST } from '../../app/api/webhooks/hostinger-mail/route'

const VALID_PAYLOAD = {
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

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://example.com/api/webhooks/hostinger-mail', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer test-webhook-secret', ...headers },
    body: JSON.stringify(body),
  })
}

const CLAIMED_EVENT = {
  id: 'row_1', senderAddress: 'sender@example.com', subject: 's', receivedAt: '2026-09-01T00:00:00Z',
} as any

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(claimWebhookEvent).mockResolvedValue({ outcome: 'claimed', event: CLAIMED_EVENT })
})

describe('POST /api/webhooks/hostinger-mail', () => {
  it('returns 401 when the bearer is missing', async () => {
    const response = await POST(makeRequest(VALID_PAYLOAD, { authorization: '' }))
    expect(response.status).toBe(401)
  })

  it('returns 422 with a stable code for an invalid payload', async () => {
    const response = await POST(makeRequest({ bad: true }))
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.code).toBe('INVALID_WEBHOOK_PAYLOAD')
  })

  it('returns 200, does not echo message content, and notifies the admin on a valid claimed event', async () => {
    const response = await POST(makeRequest(VALID_PAYLOAD))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ received: true })
    expect(notifyAdmin).toHaveBeenCalledTimes(1)
    expect(notifyAdmin).toHaveBeenCalledWith(expect.stringContaining('sender@example.com'), expect.any(String))
  })

  it('returns 200 on a duplicate delivery without creating new work or notifying again', async () => {
    vi.mocked(claimWebhookEvent).mockResolvedValue({ outcome: 'duplicate', event: CLAIMED_EVENT })
    const response = await POST(makeRequest(VALID_PAYLOAD))
    expect(response.status).toBe(200)
    expect(notifyAdmin).not.toHaveBeenCalled()
  })
})
