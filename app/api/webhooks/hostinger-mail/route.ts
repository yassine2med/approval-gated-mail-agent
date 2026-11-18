import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { isValidBearer } from '../../../../lib/webhook-auth'
import { parseWebhookPayload } from '../../../../lib/webhook-schema'
import { claimWebhookEvent } from '../../../../lib/idempotency'
import { startMailEventWorkflow } from '../../../../lib/workflow/process-mail-event'
import { notifyAdmin } from '../../../../lib/notify'

const MAX_BODY_BYTES = 100 * 1024

export async function POST(request: Request): Promise<Response> {
  if (!isValidBearer(request.headers.get('authorization'))) {
    return NextResponse.json({}, { status: 401 })
  }

  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ code: 'PAYLOAD_TOO_LARGE' }, { status: 413 })
  }

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ code: 'INVALID_WEBHOOK_PAYLOAD' }, { status: 422 })
  }

  const parsed = parseWebhookPayload(json)
  if (!parsed.ok) {
    return NextResponse.json({ code: parsed.code }, { status: 422 })
  }

  const payloadHash = createHash('sha256').update(rawBody).digest('hex')

  let claim
  try {
    claim = await claimWebhookEvent(parsed.data, payloadHash)
  } catch {
    return NextResponse.json({ code: 'PERSISTENCE_FAILURE' }, { status: 500 })
  }

  if (claim.outcome === 'claimed') {
    await notifyAdmin(
      `New email — ${claim.event.senderAddress}`,
      `Subject: ${claim.event.subject}\nFrom: ${claim.event.senderAddress}\nReceived: ${claim.event.receivedAt}\n\nAI is drafting a reply now — check the dashboard shortly.`
    )
    await startMailEventWorkflow(claim.event.id)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
