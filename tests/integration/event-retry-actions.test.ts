import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/auth', () => ({ auth: vi.fn() }))
vi.mock('../../lib/db/mail-events', () => ({ getEventById: vi.fn(), updateEventState: vi.fn() }))
vi.mock('../../lib/db/mail-audit-events', () => ({ recordAuditEvent: vi.fn() }))
vi.mock('../../lib/workflow/process-mail-event', () => ({ startMailEventWorkflow: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { auth } from '../../lib/auth'
import { getEventById, updateEventState } from '../../lib/db/mail-events'
import { recordAuditEvent } from '../../lib/db/mail-audit-events'
import { startMailEventWorkflow } from '../../lib/workflow/process-mail-event'
import { retryFailedEvent } from '../../app/(dashboard)/events/actions'

const FAILED_EVENT = {
  id: 'event_1', state: 'FAILED', senderAddress: 'a@b.com', subject: 's',
  mailboxResourceId: 'MB_1', folder: 'INBOX', messageId: 'MSG_1',
  providerEventId: 'p1', payloadHash: 'h', receivedAt: 'x', bodyUrl: 'https://x',
  errorCode: 'model error', createdAt: 'x', updatedAt: 'x',
} as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('retryFailedEvent', () => {
  it('rejects when there is no authenticated admin session', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    await expect(retryFailedEvent('event_1')).rejects.toThrow(/unauthorized/i)
    expect(startMailEventWorkflow).not.toHaveBeenCalled()
  })

  it('rejects a nonexistent event', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { login: 'yassine-emhamed' } } as any)
    vi.mocked(getEventById).mockResolvedValue(null)
    await expect(retryFailedEvent('event_1')).rejects.toThrow(/not found/i)
    expect(startMailEventWorkflow).not.toHaveBeenCalled()
  })

  it('refuses to retry an event that is not FAILED', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { login: 'yassine-emhamed' } } as any)
    vi.mocked(getEventById).mockResolvedValue({ ...FAILED_EVENT, state: 'DRAFTED' })
    await expect(retryFailedEvent('event_1')).rejects.toThrow(/not FAILED/i)
    expect(startMailEventWorkflow).not.toHaveBeenCalled()
  })

  it('resets state, records an audit event, and restarts the workflow for a FAILED event', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { login: 'yassine-emhamed' } } as any)
    vi.mocked(getEventById).mockResolvedValue(FAILED_EVENT)

    await retryFailedEvent('event_1')

    expect(updateEventState).toHaveBeenCalledWith('event_1', 'CLAIMED')
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RETRY_EVENT', targetId: 'event_1', actor: 'yassine-emhamed' })
    )
    expect(startMailEventWorkflow).toHaveBeenCalledWith('event_1')
  })
})
