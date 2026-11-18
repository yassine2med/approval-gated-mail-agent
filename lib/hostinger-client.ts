import { env } from './env'

const BASE_URL = 'https://api.mail.hostinger.com'

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${env.HOSTINGER_MAIL_TOKEN}`, 'Content-Type': 'application/json' }
}

/**
 * Fetches the full message body from the short-lived signed URL the webhook
 * provides (`data.bodyUrl`) — no Hostinger API call or auth needed, the
 * signature in the URL itself authorizes the read. Replaces an earlier
 * design that assumed a GET .../messages/{uid} endpoint would be used
 * instead; the real webhook already hands us everything we need.
 */
export async function fetchMessageBody(bodyUrl: string): Promise<{ plainText: string; html: string }> {
  const response = await fetch(bodyUrl)
  if (!response.ok) {
    throw new Error(`fetchMessageBody failed with status ${response.status}`)
  }
  const body = await response.json()
  return { plainText: body.plainText ?? '', html: body.html ?? '' }
}

/**
 * Best-effort lookup of a source message's {uid, folder} — needed to thread
 * a reply via inReplyTo — by searching the folder for messages received the
 * same day and matching on the RFC Message-ID. Not guaranteed to find a
 * match (message may have moved, search semantics may miss it); callers
 * should treat a null result as "send untethered" rather than a failure.
 */
export async function findMessageRef(
  mailboxResourceId: string,
  folder: string,
  messageId: string,
  since: string
): Promise<{ uid: number; folder: string } | null> {
  try {
    const url = `${BASE_URL}/api/v1/mailboxes/${mailboxResourceId}/folders/${folder}/messages/search`
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ since: since.slice(0, 10) }),
    })
    if (!response.ok) return null
    const body = await response.json()
    const match = (body.data ?? []).find((m: { messageId?: string }) => m.messageId === messageId)
    return match ? { uid: match.uid, folder: match.path ?? folder } : null
  } catch {
    return null
  }
}

export async function sendReply(
  mailboxResourceId: string,
  input: {
    to: string
    subject: string
    textBody: string
    htmlBody?: string
    inReplyTo?: { uid: number; folder: string } | null
  }
): Promise<{ outcome: 'sent' | 'failed' | 'unknown' }> {
  const url = `${BASE_URL}/api/v1/mailboxes/${mailboxResourceId}/send`
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        to: [input.to],
        subject: input.subject,
        text: input.textBody,
        ...(input.htmlBody ? { html: input.htmlBody } : {}),
        ...(input.inReplyTo ? { inReplyTo: input.inReplyTo } : {}),
      }),
    })
    if (response.ok) return { outcome: 'sent' } // 204 No Content on success
    if (response.status >= 400 && response.status < 500) return { outcome: 'failed' }
    return { outcome: 'unknown' }
  } catch {
    return { outcome: 'unknown' }
  }
}
