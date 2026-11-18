import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn()
vi.mock('../../lib/resend', () => ({
  getResendClient: () => ({ emails: { send: sendMock } }),
}))

import { notifyAdmin } from '../../lib/notify'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('notifyAdmin', () => {
  it('sends an email to the configured admin address from a personal-looking identity', async () => {
    sendMock.mockResolvedValue({ data: { id: 'x' }, error: null })
    await notifyAdmin('Something broke', 'details here')
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining('newsletter@yassine-emhamed.net'),
        to: 'test-admin@example.com',
        subject: 'Something broke',
        text: 'details here',
        html: expect.stringContaining('details here'),
      })
    )
  })

  it('never throws, even if the send itself fails', async () => {
    sendMock.mockRejectedValue(new Error('resend down'))
    await expect(notifyAdmin('subject', 'body')).resolves.toBeUndefined()
  })
})
