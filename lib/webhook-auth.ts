import { timingSafeEqual } from 'node:crypto'
import { env } from './env'

export function isValidBearer(header: string | null): boolean {
  if (!header || !header.startsWith('Bearer ')) return false
  const provided = header.slice('Bearer '.length)
  const expected = env.HOSTINGER_WEBHOOK_SECRET
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(providedBuf, expectedBuf)
}
