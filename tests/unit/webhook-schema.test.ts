import { describe, it, expect } from 'vitest'
import { parseWebhookPayload, deriveEventIdentity, extractEmailAddress } from '../../lib/webhook-schema'

const VALID_PAYLOAD = {
  id: 'evt_123',
  event: 'message.received',
  timestamp: '2026-09-01T00:00:00Z',
  data: {
    eventId: 'hash_123',
    mailboxAddress: 'info@example.com',
    messageId: '<MSG_xyz@example.com>',
    from: 'Sender Name <sender@example.com>',
    subject: 'Hello',
    date: '2026-09-01T00:00:00Z',
    bodyUrl: 'https://storage.googleapis.com/bucket/body.json',
  },
}

describe('parseWebhookPayload', () => {
  it('accepts a well-formed message.received payload', () => {
    const result = parseWebhookPayload(VALID_PAYLOAD)
    expect(result.ok).toBe(true)
  })

  it('rejects a payload missing required fields', () => {
    const result = parseWebhookPayload({ event: 'message.received' })
    expect(result).toEqual({ ok: false, code: 'INVALID_WEBHOOK_PAYLOAD' })
  })

  it('rejects a non-object payload', () => {
    expect(parseWebhookPayload('not json')).toEqual({ ok: false, code: 'INVALID_WEBHOOK_PAYLOAD' })
  })
})

describe('extractEmailAddress', () => {
  it('pulls the address out of a "Display Name <email>" header', () => {
    expect(extractEmailAddress('Sender Name <sender@example.com>')).toBe('sender@example.com')
  })

  it('lowercases and trims the result', () => {
    expect(extractEmailAddress('  Name <Sender@Example.com>  ')).toBe('sender@example.com')
  })

  it('returns the input unchanged (lowercased) when already a bare address', () => {
    expect(extractEmailAddress('sender@example.com')).toBe('sender@example.com')
  })
})

describe('deriveEventIdentity', () => {
  it('is stable for the same event id and type', () => {
    const parsed = parseWebhookPayload(VALID_PAYLOAD)
    if (!parsed.ok) throw new Error('expected ok')
    const a = deriveEventIdentity(parsed.data)
    const b = deriveEventIdentity(parsed.data)
    expect(a).toBe(b)
  })

  it('differs for a different event id', () => {
    const parsed1 = parseWebhookPayload(VALID_PAYLOAD)
    const parsed2 = parseWebhookPayload({ ...VALID_PAYLOAD, id: 'evt_456' })
    if (!parsed1.ok || !parsed2.ok) throw new Error('expected ok')
    expect(deriveEventIdentity(parsed1.data)).not.toBe(deriveEventIdentity(parsed2.data))
  })
})
