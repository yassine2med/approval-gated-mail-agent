import { getServiceClient } from '../supabase'
import type { MailEvent, MailEventState, NewMailEvent } from './types'

function toMailEvent(row: Record<string, unknown>): MailEvent {
  return {
    id: row.id as string,
    providerEventId: row.provider_event_id as string,
    payloadHash: row.payload_hash as string,
    mailboxResourceId: row.mailbox_resource_id as string,
    folder: row.folder as string,
    messageId: row.message_id as string,
    senderAddress: row.sender_address as string,
    receivedAt: row.received_at as string,
    bodyUrl: row.body_url as string,
    subject: row.subject as string,
    state: row.state as MailEventState,
    errorCode: (row.error_code as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/** Atomically claims an event identity. Returns 'duplicate' if providerEventId already exists (relies on the unique constraint in 0001_init.sql). */
export async function insertClaimedEvent(input: NewMailEvent): Promise<MailEvent | 'duplicate'> {
  const { data, error } = await getServiceClient()
    .from('mail_events')
    .insert({
      provider_event_id: input.providerEventId,
      payload_hash: input.payloadHash,
      mailbox_resource_id: input.mailboxResourceId,
      folder: input.folder,
      message_id: input.messageId,
      sender_address: input.senderAddress,
      received_at: input.receivedAt,
      body_url: input.bodyUrl,
      subject: input.subject,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return 'duplicate' // unique_violation
    throw new Error(`insertClaimedEvent failed: ${error.message}`)
  }
  return toMailEvent(data)
}

export async function getEventByProviderId(providerEventId: string): Promise<MailEvent | null> {
  const { data, error } = await getServiceClient()
    .from('mail_events')
    .select()
    .eq('provider_event_id', providerEventId)
    .maybeSingle()
  if (error) throw new Error(`getEventByProviderId failed: ${error.message}`)
  return data ? toMailEvent(data) : null
}

export async function getEventById(id: string): Promise<MailEvent | null> {
  const { data, error } = await getServiceClient().from('mail_events').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getEventById failed: ${error.message}`)
  return data ? toMailEvent(data) : null
}

export async function updateEventState(id: string, state: MailEventState, errorCode?: string): Promise<void> {
  const { error } = await getServiceClient()
    .from('mail_events')
    .update({ state, error_code: errorCode ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`updateEventState failed: ${error.message}`)
}

/** For the dashboard's "needs attention" view — events that errored out during processing and never produced a draft. */
export async function listEventsByState(state: MailEventState): Promise<MailEvent[]> {
  const { data, error } = await getServiceClient()
    .from('mail_events')
    .select()
    .eq('state', state)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listEventsByState failed: ${error.message}`)
  return (data ?? []).map(toMailEvent)
}
