import { start } from 'workflow/api'
import { updateEventState, getEventById } from '../db/mail-events'
import { insertDraft } from '../db/mail-drafts'
import { fetchMessageBody } from '../hostinger-client'
import { classifyAndDraft } from '../classify'
import { boundText, stripHtml } from '../sanitize'
import { notifyAdmin } from '../notify'
import type { MailEvent } from '../db/types'

/**
 * The actual processing work: fetch the source message, sanitize it,
 * classify + draft, and persist. Marked "use step" so the Workflow SDK
 * retries it durably in production, while remaining a plain async function
 * for `vi.mock()`-based unit testing — per the Workflow SDK's own testing
 * docs, directives are no-ops without the compiler, so this runs as an
 * ordinary function under Vitest.
 */
export async function runMailEventProcessing(event: MailEvent): Promise<void> {
  'use step'

  await updateEventState(event.id, 'PROCESSING')

  try {
    const message = await fetchMessageBody(event.bodyUrl)
    const cleanBody = boundText(stripHtml(message.html || message.plainText), 6000)

    const draft = await classifyAndDraft({
      subject: event.subject,
      body: cleanBody,
      senderAddress: event.senderAddress,
    })

    await insertDraft({
      mailEventId: event.id,
      classification: draft.classification,
      confidence: draft.confidence,
      senderAddress: event.senderAddress,
      subjectPreview: boundText(event.subject, 300),
      bodyPreview: cleanBody,
      proposedSubject: draft.proposedSubject,
      proposedReply: draft.proposedReply,
    })

    await updateEventState(event.id, 'DRAFTED')
  } catch (error) {
    await updateEventState(event.id, 'FAILED', error instanceof Error ? error.message : 'UNKNOWN_ERROR')
    throw error
  }
}

/** Loads the claimed event row. A separate step so the workflow can resume here without re-fetching if a later step fails and retries. */
async function loadClaimedEvent(eventId: string): Promise<MailEvent> {
  'use step'

  const event = await getEventById(eventId)
  if (!event) {
    throw new Error(`MailEvent ${eventId} not found`)
  }
  return event
}

/**
 * Own step so the admin alert fires exactly once, after runMailEventProcessing's
 * own step-level retries are exhausted — not once per retry attempt.
 */
async function notifyProcessingFailure(event: MailEvent, message: string): Promise<void> {
  'use step'

  await notifyAdmin(
    `Mail event failed to process — ${event.senderAddress}`,
    `Subject: ${event.subject}\nSender: ${event.senderAddress}\nReceived: ${event.receivedAt}\nEvent ID: ${event.id}\n\nError: ${message}\n\nCheck the dashboard for details.`
  )
}

/** The durable workflow orchestrator invoked via startMailEventWorkflow. */
export async function mailEventWorkflow(eventId: string): Promise<void> {
  'use workflow'

  const event = await loadClaimedEvent(eventId)
  try {
    await runMailEventProcessing(event)
  } catch (error) {
    await notifyProcessingFailure(event, error instanceof Error ? error.message : 'UNKNOWN_ERROR')
    throw error
  }
}

/**
 * Entry point called from the webhook route once an event is claimed.
 * Starts a durable Workflow SDK run — `start()` enqueues the workflow and
 * returns immediately without blocking the webhook response.
 */
export async function startMailEventWorkflow(eventId: string): Promise<void> {
  await start(mailEventWorkflow, [eventId])
}
