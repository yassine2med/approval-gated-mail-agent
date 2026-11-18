import { describe, it, expect } from 'vitest'
import { isAllowedRecipient } from '../../lib/policy'

describe('isAllowedRecipient', () => {
  it('allows the original sender', () => {
    expect(isAllowedRecipient('a@b.com', { originalSenderAddress: 'a@b.com' })).toBe(true)
  })
  it('rejects any address other than the original sender', () => {
    expect(isAllowedRecipient('c@d.com', { originalSenderAddress: 'a@b.com' })).toBe(false)
  })
  it('is case-insensitive on the domain and local part per RFC 5321 practical equivalence', () => {
    expect(isAllowedRecipient('A@B.com', { originalSenderAddress: 'a@b.com' })).toBe(true)
  })
})
