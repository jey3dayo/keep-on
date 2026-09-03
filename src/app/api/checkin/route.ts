import { NextResponse } from 'next/server'
import * as v from 'valibot'
import { addCheckinAction } from '@/app/actions/habits/checkin'
import { removeCheckinAction } from '@/app/actions/habits/remove-checkin'
import { getAccessIdentity } from '@/lib/auth/access'
import type { SerializableHabitError } from '@/lib/errors/serializable'
import { DateKeySchema } from '@/schemas/date-key'

const CheckinRequestSchema = v.object({
  action: v.picklist(['add', 'remove']),
  dateKey: DateKeySchema,
  habitId: v.pipe(v.string(), v.minLength(1)),
  // 操作時刻。あれば dateKey より優先してサーバーの dayStartHour から dateKey を導出する
  occurredAt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
  // オフラインキューの replay が再送を同一操作として識別するために送る
  opId: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(128))),
  // オフラインキューの replay のみが送る。通常のオンラインチェックインでは省略される
  userId: v.optional(v.pipe(v.string(), v.minLength(1))),
})

/** ビジネスロジックエラーを適切な HTTP ステータスコードにマッピング */
function errorToStatus(error: SerializableHabitError): number {
  switch (error.name) {
    case 'UnauthorizedError':
      return 401
    case 'AuthorizationError':
      return 403
    case 'ValidationError':
    case 'NotFoundError':
      return 422
    default:
      return 500
  }
}

export async function POST(request: Request) {
  const identity = await getAccessIdentity()
  if (!identity) {
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

  const { action, dateKey, habitId, occurredAt, opId, userId: queuedUserId } = parseResult.output

  // 端末共有時に前ユーザーのオフラインキューが別ユーザーの Cookie でリプレイされるのを防ぐ最終防衛線。
  // SW / hook はこの 409 を「永続的な 4xx」として扱い、該当アイテムを破棄する
  if (queuedUserId && queuedUserId !== identity.sub) {
    return NextResponse.json({ error: 'UserMismatch' }, { status: 409 })
  }

  const result =
    action === 'remove'
      ? await removeCheckinAction(habitId, dateKey, opId, occurredAt)
      : await addCheckinAction(habitId, dateKey, opId, occurredAt)

  if (!result.ok) {
    const status = errorToStatus(result.error)
    return NextResponse.json({ error: result.error.name }, { status })
  }

  return NextResponse.json({ data: result.data, ok: true })
}
