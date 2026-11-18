import { getServiceClient } from '../supabase'
import type { DraftApprovalPatch, DraftStatus, MailDraft, NewMailDraft, SendResultPatch } from './types'
import { randomUUID } from 'node:crypto'

function toMailDraft(row: Record<string, unknown>): MailDraft {
  return {
    id: row.id as string,
    mailEventId: row.mail_event_id as string,
    classification: row.classification as MailDraft['classification'],
    confidence: Number(row.confidence),
    senderAddress: row.sender_address as string,
    subjectPreview: row.subject_preview as string,
    bodyPreview: row.body_preview as string,
    proposedSubject: row.proposed_subject as string,
    proposedReply: row.proposed_reply as string,
    editedReply: (row.edited_reply as string) ?? null,
    status: row.status as DraftStatus,
    sendIdempotencyKey: (row.send_idempotency_key as string) ?? null,
    approvedBy: (row.approved_by as string) ?? null,
    approvedAt: (row.approved_at as string) ?? null,
    sentAt: (row.sent_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function insertDraft(input: NewMailDraft): Promise<MailDraft> {
  const { data, error } = await getServiceClient()
    .from('mail_drafts')
    .insert({
      mail_event_id: input.mailEventId,
      classification: input.classification,
      confidence: input.confidence,
      sender_address: input.senderAddress,
      subject_preview: input.subjectPreview,
      body_preview: input.bodyPreview,
      proposed_subject: input.proposedSubject,
      proposed_reply: input.proposedReply,
    })
    .select()
    .single()
  if (error) throw new Error(`insertDraft failed: ${error.message}`)
  return toMailDraft(data)
}

export async function getDraftById(id: string): Promise<MailDraft | null> {
  const { data, error } = await getServiceClient().from('mail_drafts').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getDraftById failed: ${error.message}`)
  return data ? toMailDraft(data) : null
}

export async function listDrafts(filter?: { status?: DraftStatus }): Promise<MailDraft[]> {
  let query = getServiceClient().from('mail_drafts').select().order('created_at', { ascending: false })
  if (filter?.status) query = query.eq('status', filter.status)
  const { data, error } = await query
  if (error) throw new Error(`listDrafts failed: ${error.message}`)
  return (data ?? []).map(toMailDraft)
}

/** Sets status to APPROVED/REJECTED/NO_REPLY_NEEDED. Material edits (editedReply set) always land in APPROVED, never a pre-approved state carried over from a prior edit. */
export async function updateDraftApproval(id: string, patch: DraftApprovalPatch): Promise<MailDraft> {
  const { data, error } = await getServiceClient()
    .from('mail_drafts')
    .update({
      status: patch.status,
      edited_reply: patch.editedReply ?? null,
      approved_by: patch.approvedBy,
      approved_at: patch.status === 'APPROVED' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`updateDraftApproval failed: ${error.message}`)
  return toMailDraft(data)
}

/** Atomically claims send idempotency by setting send_idempotency_key only if it is currently null and status is APPROVED. Returns 'already-claimed' if another request won the race or the draft isn't APPROVED. */
export async function claimDraftForSend(id: string): Promise<MailDraft | 'already-claimed'> {
  const key = randomUUID()
  const { data, error } = await getServiceClient()
    .from('mail_drafts')
    .update({ send_idempotency_key: key, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'APPROVED')
    .is('send_idempotency_key', null)
    .select()
    .maybeSingle()
  if (error) throw new Error(`claimDraftForSend failed: ${error.message}`)
  if (!data) return 'already-claimed'
  return toMailDraft(data)
}

export async function updateDraftSendResult(id: string, result: SendResultPatch): Promise<void> {
  const { error } = await getServiceClient()
    .from('mail_drafts')
    .update({ status: result.status, sent_at: result.sentAt ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`updateDraftSendResult failed: ${error.message}`)
}
