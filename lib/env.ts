const REQUIRED_KEYS = [
  'HOSTINGER_MAIL_TOKEN', 'HOSTINGER_WEBHOOK_SECRET', 'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY', 'AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET',
  'AUTH_SECRET', 'ADMIN_GITHUB_LOGIN', 'CRON_SECRET',
  'RESEND_API_KEY', 'RESEND_AUDIENCE_ID', 'HOSTINGER_MAILBOX_MAP',
  'GOOGLE_GENERATIVE_AI_API_KEY', 'ADMIN_NOTIFICATION_EMAIL',
  'NEWSLETTER_CONFIRM_SECRET',
] as const

// Deliberately not using the Vercel AI Gateway (model: 'anthropic/...' string
// routed through Vercel): it requires a verified payment card on file before
// serving any request at all, even ones covered by free credits. lib/classify.ts
// calls Google's Gemini API directly instead, using GOOGLE_GENERATIVE_AI_API_KEY —
// a free-tier key from https://aistudio.google.com/apikey, no card required.

type EnvKey = (typeof REQUIRED_KEYS)[number]

function loadEnv(): Record<EnvKey, string> {
  const missing: string[] = []
  const values = {} as Record<EnvKey, string>
  for (const key of REQUIRED_KEYS) {
    const value = process.env[key]
    if (!value) missing.push(key)
    else values[key] = value
  }
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  return values
}

export const env = loadEnv()
