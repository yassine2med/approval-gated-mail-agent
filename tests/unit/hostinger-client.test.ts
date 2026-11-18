import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('fetchMessageBody', () => {
  it('fetches and normalizes a message body from the signed URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ plainText: 'Body text', html: '<p>Body text</p>' }),
    }) as any
    const { fetchMessageBody } = await import('../../lib/hostinger-client')
    const result = await fetchMessageBody('https://storage.googleapis.com/bucket/body.json')
    expect(result).toEqual({ plainText: 'Body text', html: '<p>Body text</p>' })
    expect(global.fetch).toHaveBeenCalledWith('https://storage.googleapis.com/bucket/body.json')
  })

  it('throws on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as any
    const { fetchMessageBody } = await import('../../lib/hostinger-client')
    await expect(fetchMessageBody('https://storage.googleapis.com/bucket/body.json')).rejects.toThrow()
  })
})

describe('findMessageRef', () => {
  it('returns the matching message uid and folder', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ uid: 42, path: 'INBOX', messageId: 'MSG_1' }] }),
    }) as any
    const { findMessageRef } = await import('../../lib/hostinger-client')
    const result = await findMessageRef('MB_1', 'INBOX', 'MSG_1', '2026-09-01T00:00:00Z')
    expect(result).toEqual({ uid: 42, folder: 'INBOX' })
  })

  it('returns null when no message matches', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) }) as any
    const { findMessageRef } = await import('../../lib/hostinger-client')
    const result = await findMessageRef('MB_1', 'INBOX', 'MSG_1', '2026-09-01T00:00:00Z')
    expect(result).toBeNull()
  })

  it('returns null (never throws) on a network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as any
    const { findMessageRef } = await import('../../lib/hostinger-client')
    const result = await findMessageRef('MB_1', 'INBOX', 'MSG_1', '2026-09-01T00:00:00Z')
    expect(result).toBeNull()
  })
})

describe('sendReply', () => {
  it('returns sent on a 2xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 }) as any
    const { sendReply } = await import('../../lib/hostinger-client')
    const result = await sendReply('MB_1', { to: 'a@b.com', subject: 'Re: Hi', textBody: 'Reply' })
    expect(result).toEqual({ outcome: 'sent' })
  })

  it('returns failed on a 4xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 }) as any
    const { sendReply } = await import('../../lib/hostinger-client')
    const result = await sendReply('MB_1', { to: 'a@b.com', subject: 'Re: Hi', textBody: 'Reply' })
    expect(result).toEqual({ outcome: 'failed' })
  })

  it('returns unknown on a network error or 5xx (delivery status genuinely unknown)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as any
    const { sendReply } = await import('../../lib/hostinger-client')
    const result = await sendReply('MB_1', { to: 'a@b.com', subject: 'Re: Hi', textBody: 'Reply' })
    expect(result).toEqual({ outcome: 'unknown' })
  })

  it('includes inReplyTo in the request body when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    global.fetch = fetchMock as any
    const { sendReply } = await import('../../lib/hostinger-client')
    await sendReply('MB_1', {
      to: 'a@b.com',
      subject: 'Re: Hi',
      textBody: 'Reply',
      inReplyTo: { uid: 42, folder: 'INBOX' },
    })
    const [, options] = fetchMock.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.inReplyTo).toEqual({ uid: 42, folder: 'INBOX' })
  })

  it('includes html in the request body when htmlBody is provided, and omits it otherwise', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    global.fetch = fetchMock as any
    const { sendReply } = await import('../../lib/hostinger-client')
    await sendReply('MB_1', { to: 'a@b.com', subject: 'Re: Hi', textBody: 'Reply', htmlBody: '<p>Reply</p>' })
    const withHtml = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(withHtml.html).toBe('<p>Reply</p>')

    await sendReply('MB_1', { to: 'a@b.com', subject: 'Re: Hi', textBody: 'Reply' })
    const withoutHtml = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(withoutHtml.html).toBeUndefined()
  })
})
