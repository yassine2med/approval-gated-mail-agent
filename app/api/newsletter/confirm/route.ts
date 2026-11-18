import { NextResponse } from 'next/server'
import { confirmNewsletterSubscription, PORTFOLIO_ORIGIN } from '../../../../lib/newsletter'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const email = url.searchParams.get('email') ?? ''
  const token = url.searchParams.get('token') ?? ''
  const exp = url.searchParams.get('exp') ?? ''

  const result = await confirmNewsletterSubscription(email, token, exp)

  const redirectUrl = new URL(`${PORTFOLIO_ORIGIN}/contact`)
  redirectUrl.searchParams.set('newsletter', result)
  return NextResponse.redirect(redirectUrl, { status: 302 })
}
