import { describe, it, expect, beforeEach, vi } from 'vitest'

// next-auth's internals import `next/server` extensionlessly, which Vite's
// strict-ESM resolver can't follow outside a real Next.js build (Next's own
// package.json admits this: "Next.js does not yet correctly use the
// package.json#exports field"). isAdminLogin is pure env-var logic and never
// touches these internals, so mock them out rather than fight the packaging
// quirk in a unit test.
vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}))
vi.mock('next-auth/providers/github', () => ({ default: vi.fn() }))

describe('isAdminLogin', () => {
  beforeEach(() => { process.env.ADMIN_GITHUB_LOGIN = 'yassine-emhamed' })

  it('allows the configured admin login', async () => {
    const { isAdminLogin } = await import('../../lib/auth')
    expect(isAdminLogin('yassine-emhamed')).toBe(true)
  })

  it('rejects any other login', async () => {
    const { isAdminLogin } = await import('../../lib/auth')
    expect(isAdminLogin('someone-else')).toBe(false)
  })

  it('rejects a missing login', async () => {
    const { isAdminLogin } = await import('../../lib/auth')
    expect(isAdminLogin(undefined)).toBe(false)
  })
})
