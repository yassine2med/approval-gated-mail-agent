import { describe, it, expect, vi } from 'vitest'

vi.mock('ai', () => ({ generateObject: vi.fn() }))

import { generateObject } from 'ai'
import { classifyAndDraft } from '../../lib/classify'

describe('classifyAndDraft', () => {
  it('returns validated structured output from the model', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        classification: 'ACTION_REQUIRED',
        confidence: 0.87,
        rationale: 'Sender is requesting a meeting.',
        proposedSubject: 'Re: Meeting request',
        proposedReply: 'Thanks for reaching out, happy to meet next week.',
      },
    } as any)

    const result = await classifyAndDraft({ subject: 'Meeting?', body: 'Can we meet?', senderAddress: 'a@b.com' })
    expect(result.classification).toBe('ACTION_REQUIRED')
    expect(result.confidence).toBeCloseTo(0.87)
    expect(result.proposedReply).toContain('happy to meet')
  })

  it('throws if the model omits a required field (schema validation catches malformed output)', async () => {
    vi.mocked(generateObject).mockRejectedValue(new Error('schema validation failed'))
    await expect(
      classifyAndDraft({ subject: 'x', body: 'y', senderAddress: 'a@b.com' })
    ).rejects.toThrow()
  })
})
