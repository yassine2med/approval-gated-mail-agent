import { notFound } from 'next/navigation'
import { getDraftById } from '../../../../lib/db/mail-drafts'
import { approveDraft, editAndApproveDraft, rejectDraft, markNoReplyNeeded, sendApprovedDraft } from './actions'

export default async function DraftDetailPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params
  const draft = await getDraftById(draftId)
  if (!draft) notFound()

  async function approve() { 'use server'; await approveDraft(draftId) }
  async function reject() { 'use server'; await rejectDraft(draftId) }
  async function noReply() { 'use server'; await markNoReplyNeeded(draftId) }
  async function send() { 'use server'; await sendApprovedDraft(draftId) }
  async function editAndApprove(formData: FormData) {
    'use server'
    const editedReply = String(formData.get('editedReply') ?? '')
    await editAndApproveDraft(draftId, editedReply)
  }

  return (
    <div>
      <h1>Draft from {draft.senderAddress}</h1>
      <p>Classification: {draft.classification} (confidence {draft.confidence})</p>
      <p>Subject preview: {draft.subjectPreview}</p>
      <p>Body preview: {draft.bodyPreview}</p>
      <p>Status: {draft.status}</p>
      <h2>Proposed reply</h2>
      <form action={editAndApprove}>
        <textarea name="editedReply" defaultValue={draft.editedReply ?? draft.proposedReply} rows={10} cols={80} />
        <div>
          <button type="submit">Edit and approve</button>
        </div>
      </form>
      <form action={approve}><button type="submit">Approve unchanged</button></form>
      <form action={reject}><button type="submit">Reject</button></form>
      <form action={noReply}><button type="submit">No reply needed</button></form>
      {draft.status === 'APPROVED' && (
        <form action={send}><button type="submit">Send</button></form>
      )}
    </div>
  )
}
