import { escapeHtml } from './sanitize'

const HEADSHOT_URL = 'https://yassine-emhamed.net/yassine-emhamed-headshot.webp'

/**
 * Renders the AI-drafted reply's plain-text body as HTML and appends a
 * signature with a headshot. The plain-text version (built separately by
 * the caller) remains the source of truth sent alongside this as `text` —
 * this is purely the richer alternative for clients that render HTML.
 */
export function buildReplyHtml(textBody: string): string {
  const escapedBody = escapeHtml(textBody).replace(/\n/g, '<br>')

  return `
<div style="font-family: -apple-system, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a;">
  <div>${escapedBody}</div>
  <table cellpadding="0" cellspacing="0" style="margin-top: 24px;">
    <tr>
      <td style="padding-right: 12px;">
        <img src="${HEADSHOT_URL}" width="56" height="56" alt="Yassine Emhamed"
             style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; display: block;">
      </td>
      <td style="font-size: 13px; color: #444;">
        <strong>Yassine Emhamed</strong><br>
        <a href="https://yassine-emhamed.net" style="color: #444; text-decoration: none;">yassine-emhamed.net</a>
      </td>
    </tr>
  </table>
</div>
`.trim()
}
