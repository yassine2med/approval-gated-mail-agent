import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const REQUIRED = [
  'HOSTINGER_MAIL_TOKEN', 'HOSTINGER_WEBHOOK_SECRET', 'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY', 'AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET',
  'AUTH_SECRET', 'ADMIN_GITHUB_LOGIN', 'CRON_SECRET',
]

describe('env', () => {
  const original = { ...process.env }
  beforeEach(() => { for (const k of REQUIRED) process.env[k] = `test-${k}` })
  afterEach(() => { process.env = { ...original } })

  it('exposes all required vars when present', async () => {
    vi.resetModules()
    const { env } = await import('../../lib/env')
    for (const k of REQUIRED) expect((env as Record<string, string>)[k]).toBe(`test-${k}`)
  })

  it('throws listing every missing var', async () => {
    delete process.env.HOSTINGER_MAIL_TOKEN
    delete process.env.SUPABASE_URL
    vi.resetModules()
    await expect(import('../../lib/env')).rejects.toThrow(/HOSTINGER_MAIL_TOKEN.*SUPABASE_URL|SUPABASE_URL.*HOSTINGER_MAIL_TOKEN/)
  })
})
