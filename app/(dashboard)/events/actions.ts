'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '../../../lib/auth'
import { getEventById, updateEventState } from '../../../lib/db/mail-events'
import { recordAuditEvent } from '../../../lib/db/mail-audit-events'
import { startMailEventWorkflow } from '../../../lib/workflow/process-mail-event'

async function requireAdminLogin(): Promise<string> {
  const session = await auth()
  const login = (session?.user as { login?: string } | undefined)?.login
  if (!login) throw new Error('Unauthorized: no authenticated admin session')
  return login
}

/**
 * Manual retry only — never automatic. A FAILED event otherwise sits
 * forever with no draft and no further attempt; this lets an admin decide
 * when it's worth trying again (e.g. after fixing whatever caused the
 * failure) rather than silently retrying against a persistently broken
 * sender or payload.
 */
export async function retryFailedEvent(eventId: string): Promise<void> {
  const login = await requireAdminLogin()

  const event = await getEventById(eventId)
  if (!event) throw new Error(`Event ${eventId} not found`)
  if (event.state !== 'FAILED') {
    throw new Error(`Event ${eventId} is not FAILED (currently ${event.state}) — refusing to retry`)
  }

  await updateEventState(eventId, 'CLAIMED')
  await recordAuditEvent({ actor: login, action: 'RETRY_EVENT', targetType: 'mail_event', targetId: eventId, outcome: 'RETRY_STARTED' })
  await startMailEventWorkflow(eventId)

  revalidatePath('/events')
}
