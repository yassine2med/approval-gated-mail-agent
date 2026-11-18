import { env } from './env'

/**
 * The real Hostinger webhook payload identifies the mailbox only by address
 * (e.g. "info@yassine-emhamed.net"), never by the opaque resourceId the
 * Send/Messages APIs require (e.g. "AC48d6f8fe1ea73abf53c606e48b2b" — only
 * discoverable via GET /api/v1/me). HOSTINGER_MAILBOX_MAP bridges the two,
 * as a JSON object of { [address]: resourceId }.
 */
let cachedRegistry: Record<string, string> | null = null

function loadRegistry(): Record<string, string> {
  if (cachedRegistry) return cachedRegistry
  try {
    cachedRegistry = JSON.parse(env.HOSTINGER_MAILBOX_MAP) as Record<string, string>
  } catch {
    throw new Error('HOSTINGER_MAILBOX_MAP is not valid JSON')
  }
  return cachedRegistry
}

export function resolveMailboxResourceId(address: string): string {
  const registry = loadRegistry()
  const resourceId = registry[address.toLowerCase()]
  if (!resourceId) {
    throw new Error(`Unknown mailbox address: ${address}`)
  }
  return resourceId
}
