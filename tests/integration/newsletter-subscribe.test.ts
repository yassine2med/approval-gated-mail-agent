import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/newsletter', () => ({ subscribeToNewsletter: vi.fn() }))

import { subscribeToNewsletter } from '../../lib/newsletter'
import { POST, OPTIONS } from '../../app/api/newsletter/subscribe/route'

function makeRequest(body: unknown, origin = 'https://yassine-emhamed.net') {
  return new Request('https://example.com/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/newsletter/subscribe', () => {
  it('returns 200 "pending" and a CORS header for the portfolio origin on success', async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ outcome: 'pending' })
    const response = await POST(makeRequest({ email: 'a@b.com' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'pending' })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://yassine-emhamed.net')
  })

  it('returns 200 "already-subscribed" without re-sending anything for an existing active subscriber', async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ outcome: 'already-subscribed' })
    const response = await POST(makeRequest({ email: 'a@b.com' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'already-subscribed' })
  })

  it('returns 422 for an invalid email', async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ outcome: 'invalid-email' })
    const response = await POST(makeRequest({ email: 'nope' }))
    expect(response.status).toBe(422)
  })

  it('omits CORS headers for an unrecognized origin', async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ outcome: 'pending' })
    const response = await POST(makeRequest({ email: 'a@b.com' }, 'https://evil.example.com'))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('handles OPTIONS preflight', async () => {
    const response = await OPTIONS(makeRequest({}))
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://yassine-emhamed.net')
  })
})
