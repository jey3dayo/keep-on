import { NextResponse } from 'next/server'
import { getAccessIdentity } from '@/lib/auth/access'

export async function GET() {
  const identity = await getAccessIdentity()

  if (!identity) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
        status: 401,
      }
    )
  }

  return NextResponse.json({ userId: identity.sub }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
