import { NextResponse } from 'next/server'
import { subscribeToNewsletter } from '../../../../lib/newsletter'

// Only the portfolio site may call this endpoint from a browser.
const ALLOWED_ORIGINS = new Set([
  'https://yassine-emhamed.net',
  'https://www.yassine-emhamed.net',
])

function corsHeaders(origin: string | null): HeadersInit {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

export async function POST(request: Request): Promise<Response> {
  const headers = corsHeaders(request.headers.get('origin'))

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_BODY' }, { status: 422, headers })
  }

  const email = typeof body === 'object' && body !== null && 'email' in body ? String((body as { email: unknown }).email) : ''

  const result = await subscribeToNewsletter(email)

  if (result.outcome === 'invalid-email') {
    return NextResponse.json({ code: 'INVALID_EMAIL' }, { status: 422, headers })
  }
  if (result.outcome === 'failed') {
    return NextResponse.json({ code: 'SUBSCRIBE_FAILED' }, { status: 502, headers })
  }
  if (result.outcome === 'already-subscribed') {
    return NextResponse.json({ status: 'already-subscribed' }, { status: 200, headers })
  }

  return NextResponse.json({ status: 'pending' }, { status: 200, headers })
}
