'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '../../../../lib/auth'
import { updateDraftApproval } from '../../../../lib/db/mail-drafts'
import { recordAuditEvent } from '../../../../lib/db/mail-audit-events'

async function requireAdminLogin(): Promise<string> {
  const session = await auth()
  const login = (session?.user as { login?: string } | undefined)?.login
  if (!login) throw new Error('Unauthorized: no authenticated admin session')
  return login
}

export async function approveDraft(draftId: string): Promise<void> {
  const login = await requireAdminLogin()
  await updateDraftApproval(draftId, { status: 'APPROVED', approvedBy: login })
  await recordAuditEvent({ actor: login, action: 'APPROVE_DRAFT', targetType: 'mail_draft', targetId: draftId, outcome: 'SUCCESS' })
  revalidatePath('/')
  revalidatePath(`/drafts/${draftId}`)
}

export async function editAndApproveDraft(draftId: string, editedReply: string): Promise<void> {
  const login = await requireAdminLogin()
  await updateDraftApproval(draftId, { status: 'APPROVED', approvedBy: login, editedReply })
  await recordAuditEvent({ actor: login, action: 'EDIT_AND_APPROVE_DRAFT', targetType: 'mail_draft', targetId: draftId, outcome: 'SUCCESS' })
  revalidatePath('/')
  revalidatePath(`/drafts/${draftId}`)
}

export async function rejectDraft(draftId: string): Promise<void> {
  const login = await requireAdminLogin()
  await updateDraftApproval(draftId, { status: 'REJECTED', approvedBy: login })
  await recordAuditEvent({ actor: login, action: 'REJECT_DRAFT', targetType: 'mail_draft', targetId: draftId, outcome: 'SUCCESS' })
  revalidatePath('/')
  revalidatePath(`/drafts/${draftId}`)
}

export async function markNoReplyNeeded(draftId: string): Promise<void> {
  const login = await requireAdminLogin()
  await updateDraftApproval(draftId, { status: 'NO_REPLY_NEEDED', approvedBy: login })
  await recordAuditEvent({ actor: login, action: 'MARK_NO_REPLY_NEEDED', targetType: 'mail_draft', targetId: draftId, outcome: 'SUCCESS' })
  revalidatePath('/')
  revalidatePath(`/drafts/${draftId}`)
}

export async function sendApprovedDraft(draftId: string): Promise<void> {
  await requireAdminLogin()
  const { sendDraft } = await import('../../../../lib/send-draft')
  await sendDraft(draftId)
  revalidatePath('/')
  revalidatePath(`/drafts/${draftId}`)
}
