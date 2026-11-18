// Global test setup: seeds every var lib/env.ts requires, so importing any
// module that transitively imports env.ts never throws just because a given
// test only cares about one or two of them. Individual tests still override
// specific vars (and call vi.resetModules() before re-importing) to exercise
// real behavior for that var.
const DEFAULTS: Record<string, string> = {
  HOSTINGER_MAIL_TOKEN: 'test-hostinger-mail-token',
  HOSTINGER_WEBHOOK_SECRET: 'test-webhook-secret',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  AUTH_GITHUB_ID: 'test-github-id',
  AUTH_GITHUB_SECRET: 'test-github-secret',
  AUTH_SECRET: 'test-auth-secret',
  ADMIN_GITHUB_LOGIN: 'test-admin-login',
  CRON_SECRET: 'test-cron-secret',
  RESEND_API_KEY: 'test-resend-api-key',
  RESEND_AUDIENCE_ID: 'test-resend-audience-id',
  HOSTINGER_MAILBOX_MAP: '{"a@b.com":"MB_1"}',
  GOOGLE_GENERATIVE_AI_API_KEY: 'test-google-ai-key',
  ADMIN_NOTIFICATION_EMAIL: 'test-admin@example.com',
  NEWSLETTER_CONFIRM_SECRET: 'test-newsletter-confirm-secret',
}

for (const [key, value] of Object.entries(DEFAULTS)) {
  if (!process.env[key]) process.env[key] = value
}
