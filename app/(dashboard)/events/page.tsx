import { listEventsByState } from '../../../lib/db/mail-events'
import { retryFailedEvent } from './actions'

export default async function FailedEventsPage() {
  const events = await listEventsByState('FAILED')

  return (
    <div>
      <h1>Failed events</h1>
      <p>Events that errored out during AI processing and never produced a draft. Retry after fixing the underlying cause (check the error below, or your admin alert email for the same detail).</p>
      {events.length === 0 && <p>No failed events.</p>}
      <ul>
        {events.map((event) => {
          async function retry() {
            'use server'
            await retryFailedEvent(event.id)
          }
          return (
            <li key={event.id}>
              <strong>{event.senderAddress}</strong> — {event.subject}
              <br />
              Received: {event.receivedAt}
              <br />
              Error: {event.errorCode}
              <br />
              <form action={retry}>
                <button type="submit">Retry</button>
              </form>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
