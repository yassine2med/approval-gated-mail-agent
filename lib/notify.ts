import { getResendClient } from './resend'
import { env } from './env'

/**
 * Best-effort admin alert for states that otherwise fail silently — a mail
 * event that errored out during AI processing, or a draft that couldn't be
 * (or wasn't allowed to be) sent. Never throws: a notification failure must
 * not mask or replace the original error it's reporting.
 */
export async function notifyAdmin(subject: string, body: string): Promise<void> {
  try {
    await getResendClient().emails.send({
      // Deliberately reuses the newsletter sender identity, not a fresh
      // "alerts@" address. Three separate live tests confirmed
      // alerts@yassine-emhamed.net was accepted by Resend/SES
      // ("delivered") but silently discarded by Gmail before even
      // reaching Spam — varying display name, subject, and adding an
      // HTML alternative made no difference, isolating the cause to the
      // sender identity itself (a brand-new "alerts@" local part reads as
      // a common phishing/spoofing pattern to Gmail's filters). This
      // address has an established track record of landing normally.
      from: 'Yassine Emhamed <newsletter@yassine-emhamed.net>',
      to: env.ADMIN_NOTIFICATION_EMAIL,
      subject,
      text: body,
      html: `<div style="font-family: -apple-system, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a; white-space: pre-wrap;">${body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`,
    })
  } catch {
    // Swallow: alerting is best-effort, never let it fail the caller's own error handling.
  }
}
