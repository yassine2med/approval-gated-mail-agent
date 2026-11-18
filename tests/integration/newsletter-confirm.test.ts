import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/newsletter', () => ({
  confirmNewsletterSubscription: vi.fn(),
  PORTFOLIO_ORIGIN: 'https://yassine-emhamed.net',
}))

import { confirmNewsletterSubscription } from '../../lib/newsletter'
import { GET } from '../../app/api/newsletter/confirm/route'

function makeRequest(params: Record<string, string>) {
  const url = new URL('https://example.com/api/newsletter/confirm')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url)
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/newsletter/confirm', () => {
  it('redirects to the portfolio contact page with the outcome, on confirmed', async () => {
    vi.mocked(confirmNewsletterSubscription).mockResolvedValue('confirmed')
    const response = await GET(makeRequest({ email: 'a@b.com', token: 'tok', exp: '123' }))
    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('location')!)
    expect(location.origin + location.pathname).toBe('https://yassine-emhamed.net/contact')
    expect(location.searchParams.get('newsletter')).toBe('confirmed')
  })

  it('passes email/token/exp through to confirmNewsletterSubscription', async () => {
    vi.mocked(confirmNewsletterSubscription).mockResolvedValue('invalid')
    await GET(makeRequest({ email: 'a@b.com', token: 'tok', exp: '123' }))
    expect(confirmNewsletterSubscription).toHaveBeenCalledWith('a@b.com', 'tok', '123')
  })

  it('still redirects (with the outcome) when params are missing', async () => {
    vi.mocked(confirmNewsletterSubscription).mockResolvedValue('invalid')
    const response = await GET(makeRequest({}))
    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('location')!)
    expect(location.searchParams.get('newsletter')).toBe('invalid')
  })
})
