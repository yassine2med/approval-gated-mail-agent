import { describe, it, expect, beforeEach } from 'vitest'

describe('isValidBearer', () => {
  beforeEach(() => { process.env.HOSTINGER_WEBHOOK_SECRET = 'correct-secret' })

  it('accepts the exact configured bearer token', async () => {
    const { isValidBearer } = await import('../../lib/webhook-auth')
    expect(isValidBearer('Bearer correct-secret')).toBe(true)
  })

  it('rejects a wrong token', async () => {
    const { isValidBearer } = await import('../../lib/webhook-auth')
    expect(isValidBearer('Bearer wrong-secret')).toBe(false)
  })

  it('rejects a missing header', async () => {
    const { isValidBearer } = await import('../../lib/webhook-auth')
    expect(isValidBearer(null)).toBe(false)
  })

  it('rejects a header missing the Bearer prefix', async () => {
    const { isValidBearer } = await import('../../lib/webhook-auth')
    expect(isValidBearer('correct-secret')).toBe(false)
  })
})
