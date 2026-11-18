import { describe, it, expect } from 'vitest'
import { boundText, stripHtml, delimitAsUntrustedData } from '../../lib/sanitize'

describe('boundText', () => {
  it('returns input unchanged when under the limit', () => {
    expect(boundText('hello', 10)).toBe('hello')
  })
  it('truncates and marks truncation when over the limit', () => {
    const result = boundText('a'.repeat(20), 10)
    expect(result.length).toBeLessThanOrEqual(10 + '... [truncated]'.length)
    expect(result.endsWith('[truncated]')).toBe(true)
  })
})

describe('stripHtml', () => {
  it('removes tags and scripts, keeping text content', () => {
    const result = stripHtml('<p>Hello <b>world</b></p><script>alert(1)</script>')
    expect(result).toBe('Hello world')
  })
})

describe('delimitAsUntrustedData', () => {
  it('wraps subject and body in an explicit untrusted-data block', () => {
    const result = delimitAsUntrustedData('Subj', 'Body text')
    expect(result).toContain('BEGIN UNTRUSTED EMAIL CONTENT')
    expect(result).toContain('END UNTRUSTED EMAIL CONTENT')
    expect(result).toContain('Subj')
    expect(result).toContain('Body text')
  })
})
