import { getServiceClient } from './supabase'

const DRAFT_RETENTION_DAYS = 30
const AUDIT_RETENTION_DAYS = 180

function daysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

export async function runRetentionSweep(
  now: Date = new Date()
): Promise<{ draftsDeleted: number; auditEventsDeleted: number }> {
  const client = getServiceClient()

  const draftsResult = await client
    .from('mail_drafts')
    .delete()
    .lt('created_at', daysAgo(now, DRAFT_RETENTION_DAYS))

  const auditResult = await client
    .from('mail_audit_events')
    .delete()
    .lt('created_at', daysAgo(now, AUDIT_RETENTION_DAYS))

  return {
    draftsDeleted: draftsResult.count ?? 0,
    auditEventsDeleted: auditResult.count ?? 0,
  }
}
