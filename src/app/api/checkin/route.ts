import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import * as v from 'valibot'
import { addCheckinAction } from '@/app/actions/habits/checkin'
import { removeCheckinAction } from '@/app/actions/habits/remove-checkin'
import { DateKeySchema } from '@/schemas/date-key'

const CheckinRequestSchema = v.object({
  action: v.picklist(['add', 'remove']),
  dateKey: DateKeySchema,
  habitId: v.pipe(v.string(), v.minLength(1)),
})

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

  const parseResult = v.safeParse(CheckinRequestSchema, body)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { habitId, action, dateKey } = parseResult.output

  const result =
    action === 'remove' ? await removeCheckinAction(habitId, dateKey) : await addCheckinAction(habitId, dateKey)

  if (!result.ok) {
    return NextResponse.json({ error: 'Checkin failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data: result.data })
}
