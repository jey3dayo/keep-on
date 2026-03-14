import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { addCheckinAction } from '@/app/actions/habits/checkin'
import { removeCheckinAction } from '@/app/actions/habits/remove-checkin'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).habitId !== 'string' ||
    !['add', 'remove'].includes((body as Record<string, unknown>).action as string)
  ) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { habitId, action } = body as { habitId: string; action: 'add' | 'remove' }

  const result = action === 'remove' ? await removeCheckinAction(habitId) : await addCheckinAction(habitId)

  if (!result.ok) {
    return NextResponse.json({ error: 'Checkin failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data: result.data })
}
