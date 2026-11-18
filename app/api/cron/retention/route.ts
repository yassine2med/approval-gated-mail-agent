import { NextResponse } from 'next/server'
import { runRetentionSweep } from '../../../../lib/retention'
import { env } from '../../../../lib/env'

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({}, { status: 401 })
  }
  const result = await runRetentionSweep()
  return NextResponse.json(result, { status: 200 })
}
