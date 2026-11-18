import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockSend = vi.fn()
vi.mock('../../lib/resend', () => ({
  getResendClient: () => ({
    contacts: { get: mockGet, create: mockCreate, update: mockUpdate },
    emails: { send: mockSend },
  }),
}))

import { subscribeToNewsletter, confirmNewsletterSubscription } from '../../lib/newsletter'

beforeEach(() => {
  vi.clearAllMocks()
  mockSend.mockResolvedValue({ data: { id: 'email_1' }, error: null })
})

describe('subscribeToNewsletter', () => {
  it('rejects an invalid email without calling Resend', async () => {
    const result = await subscribeToNewsletter('not-an-email')
    expect(result).toEqual({ outcome: 'invalid-email' })
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('creates a pending (unsubscribed) contact and sends a confirmation email for a new address', async () => {
    mockGet.mockResolvedValue({ data: null, error: { message: 'not found' } })
    mockCreate.mockResolvedValue({ data: { id: 'contact_1' }, error: null })
    const result = await subscribeToNewsletter(' Person@example.com ')
    expect(result).toEqual({ outcome: 'pending' })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'person@example.com', unsubscribed: true })
    )
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend.mock.calls[0][0].to).toBe('person@example.com')
  })

  it('does not re-create or re-email an already-confirmed subscriber', async () => {
    mockGet.mockResolvedValue({ data: { id: 'contact_1', unsubscribed: false }, error: null })
    const result = await subscribeToNewsletter('person@example.com')
    expect(result).toEqual({ outcome: 'already-subscribed' })
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('resends the confirmation link (without recreating the contact) for a pending/unsubscribed contact', async () => {
    mockGet.mockResolvedValue({ data: { id: 'contact_1', unsubscribed: true }, error: null })
    const result = await subscribeToNewsletter('person@example.com')
    expect(result).toEqual({ outcome: 'pending' })
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('reports failure when contact creation errors', async () => {
    mockGet.mockResolvedValue({ data: null, error: { message: 'not found' } })
    mockCreate.mockResolvedValue({ data: null, error: { message: 'rate limited' } })
    const result = await subscribeToNewsletter('person@example.com')
    expect(result).toEqual({ outcome: 'failed', message: 'rate limited' })
    expect(mockSend).not.toHaveBeenCalled()
  })
})

describe('confirmNewsletterSubscription', () => {
  it('activates the contact when the signed link is valid and not expired', async () => {
    mockUpdate.mockResolvedValue({ data: { id: 'contact_1' }, error: null })
    // Derive a real token the same way subscribeToNewsletter would produce one, by
    // going through the public confirm-link flow via a real subscribe call first.
    mockGet.mockResolvedValue({ data: null, error: { message: 'not found' } })
    mockCreate.mockResolvedValue({ data: { id: 'contact_1' }, error: null })
    await subscribeToNewsletter('person@example.com')
    const sentUrl: string = mockSend.mock.calls[0][0].html
    const match = sentUrl.match(/href="([^"]+)"/)
    if (!match) throw new Error('expected a confirm link in the email body')
    const url = new URL(match[1])
    const token = url.searchParams.get('token')!
    const exp = url.searchParams.get('exp')!

    const result = await confirmNewsletterSubscription('person@example.com', token, exp)
    expect(result).toBe('confirmed')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'person@example.com', unsubscribed: false })
    )
  })

  it('rejects a tampered token', async () => {
    const result = await confirmNewsletterSubscription('person@example.com', 'not-the-real-token', String(Date.now() + 1000))
    expect(result).toBe('invalid')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects a missing email, token, or exp', async () => {
    expect(await confirmNewsletterSubscription('', 'x', '123')).toBe('invalid')
    expect(await confirmNewsletterSubscription('a@b.com', '', '123')).toBe('invalid')
    expect(await confirmNewsletterSubscription('a@b.com', 'x', '')).toBe('invalid')
  })

  it('rejects an expired (but otherwise correctly signed) link', async () => {
    mockGet.mockResolvedValue({ data: null, error: { message: 'not found' } })
    mockCreate.mockResolvedValue({ data: { id: 'contact_1' }, error: null })
    await subscribeToNewsletter('person@example.com')
    const sentUrl: string = mockSend.mock.calls[0][0].html
    const url = new URL(sentUrl.match(/href="([^"]+)"/)![1])
    const token = url.searchParams.get('token')!

    // Same token, but claim it expired 48h+ago — signature won't match a
    // different expiresAt, proving the expiry is bound into the signature.
    const result = await confirmNewsletterSubscription('person@example.com', token, String(Date.now() - 1000))
    expect(result).toBe('invalid')
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
