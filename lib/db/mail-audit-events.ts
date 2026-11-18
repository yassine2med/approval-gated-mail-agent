import { getServiceClient } from '../supabase'
import type { NewAuditEvent } from './types'

export async function recordAuditEvent(input: NewAuditEvent): Promise<void> {
  const { error } = await getServiceClient().from('mail_audit_events').insert({
    actor: input.actor,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    outcome: input.outcome,
  })
  if (error) throw new Error(`recordAuditEvent failed: ${error.message}`)
}
