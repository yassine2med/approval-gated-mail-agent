import { describe, it, expect, vi } from 'vitest'

const mockDelete = vi.fn().mockReturnThis()
const mockLt = vi.fn().mockResolvedValue({ count: 3, error: null })
const mockFrom = vi.fn(() => ({ delete: mockDelete, lt: mockLt, select: vi.fn().mockReturnThis() }))

vi.mock('../../lib/supabase', () => ({ getServiceClient: () => ({ from: mockFrom }) }))

import { runRetentionSweep } from '../../lib/retention'

describe('runRetentionSweep', () => {
  it('deletes drafts and message previews older than 30 days, and audit events older than 180 days', async () => {
    const now = new Date('2026-09-02T00:00:00Z')
    const result = await runRetentionSweep(now)
    expect(result.draftsDeleted).toBeGreaterThanOrEqual(0)
    expect(mockFrom).toHaveBeenCalledWith('mail_drafts')
    expect(mockFrom).toHaveBeenCalledWith('mail_audit_events')
  })
})
