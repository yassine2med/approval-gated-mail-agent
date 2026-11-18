import { describe, it, expect } from 'vitest'
import { buildReplyHtml } from '../../lib/email-signature'

describe('buildReplyHtml', () => {
  it('includes the headshot image', () => {
    const html = buildReplyHtml('Hi there')
    expect(html).toContain('yassine-emhamed-headshot.webp')
    expect(html).toContain('<img')
  })

  it('preserves line breaks as <br>', () => {
    const html = buildReplyHtml('Line one\nLine two')
    expect(html).toContain('Line one<br>Line two')
  })

  it('escapes HTML in the body so untrusted-derived content cannot inject markup', () => {
    const html = buildReplyHtml('<script>alert(1)</script>')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
