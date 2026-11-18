import Link from 'next/link'
import { listDrafts } from '../../lib/db/mail-drafts'

export default async function DraftListPage() {
  const drafts = await listDrafts({ status: 'PENDING' })
  return (
    <div>
      <p><Link href="/events">Failed events →</Link></p>
      <h1>Pending drafts</h1>
      {drafts.length === 0 && <p>No pending drafts.</p>}
      <ul>
        {drafts.map((draft) => (
          <li key={draft.id}>
            <Link href={`/drafts/${draft.id}`}>
              {draft.senderAddress} — {draft.subjectPreview} ({draft.classification})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
