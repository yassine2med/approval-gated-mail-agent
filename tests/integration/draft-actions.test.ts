import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/auth', () => ({ auth: vi.fn() }))
vi.mock('../../lib/db/mail-drafts', () => ({ updateDraftApproval: vi.fn(), getDraftById: vi.fn() }))
vi.mock('../../lib/db/mail-audit-events', () => ({ recordAuditEvent: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { auth } from '../../lib/auth'
import { updateDraftApproval } from '../../lib/db/mail-drafts'
import { recordAuditEvent } from '../../lib/db/mail-audit-events'
import { approveDraft, rejectDraft } from '../../app/(dashboard)/drafts/[draftId]/actions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('approveDraft', () => {
  it('rejects when there is no authenticated admin session', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    await expect(approveDraft('draft_1')).rejects.toThrow(/unauthorized/i)
    expect(updateDraftApproval).not.toHaveBeenCalled()
  })

  it('approves and records an audit event when authorized', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { login: 'yassine-emhamed' } } as any)
    vi.mocked(updateDraftApproval).mockResolvedValue({ id: 'draft_1' } as any)
    await approveDraft('draft_1')
    expect(updateDraftApproval).toHaveBeenCalledWith('draft_1', { status: 'APPROVED', approvedBy: 'yassine-emhamed' })
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPROVE_DRAFT', targetId: 'draft_1', outcome: 'SUCCESS' })
    )
  })
})

describe('rejectDraft', () => {
  it('records a REJECT_DRAFT audit event', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { login: 'yassine-emhamed' } } as any)
    vi.mocked(updateDraftApproval).mockResolvedValue({ id: 'draft_1' } as any)
    await rejectDraft('draft_1')
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REJECT_DRAFT', targetId: 'draft_1' })
    )
  })
})
