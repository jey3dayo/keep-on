'use server'

import { Result } from '@praha/byethrow'
import { toActionResult } from '@/lib/actions/result'
import { createRequestMeta } from '@/lib/logging'
import { createSkip, deleteSkip } from '@/lib/queries/skip'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { validateHabitActionInput } from '@/validators/habit-action'
import {
  createHabitCheckinSpans,
  requireCheckinUserId,
  requireHabitForUserWithRetry,
} from './checkin-shared'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

export async function addSkipAction(habitId: string, dateKey?: string): HabitActionResult<{ skipped: boolean }> {
  const requestMeta = createRequestMeta('action.habits.skip')
  const timeoutMs = getRequestTimeoutMs()
  const spans = createHabitCheckinSpans(timeoutMs)

  const result = await Result.pipe(
    validateHabitActionInput({ habitId, dateKey }),
    Result.andThen(async (input) => {
      const baseMeta = { ...requestMeta, habitId: input.habitId }
      return await Result.try({
        try: async () => {
          return await spans.runWithRequestTimeout(
            'action.habits.skip',
            async () => {
              const userId = await requireCheckinUserId('action.habits.skip', baseMeta, spans.timeoutMs)
              const metaWithUser = { ...baseMeta, userId }

              await requireHabitForUserWithRetry({
                habitId: input.habitId,
                userId,
                meta: metaWithUser,
                runWithRetry: spans.runWithRetry,
                actionName: 'action.habits.skip',
              })

              const targetDate = input.dateKey ?? new Date()
              const skip = await spans.runWithDbTimeout(
                'action.habits.skip.createSkip',
                () => createSkip(input.habitId, targetDate),
                metaWithUser
              )

              await revalidateHabitPaths(userId, { sync: true })

              return { skipped: skip !== null }
            },
            baseMeta
          )
        },
        catch: (error) => error,
      })
    }),
    Result.mapError((error) => serializeActionError(error, 'スキップの設定に失敗しました'))
  )

  return toActionResult(result)
}

export async function removeSkipAction(habitId: string, dateKey?: string): HabitActionResult {
  const requestMeta = createRequestMeta('action.habits.remove-skip')
  const timeoutMs = getRequestTimeoutMs()
  const spans = createHabitCheckinSpans(timeoutMs)

  const result = await Result.pipe(
    validateHabitActionInput({ habitId, dateKey }),
    Result.andThen(async (input) => {
      const baseMeta = { ...requestMeta, habitId: input.habitId }
      return await Result.try({
        try: async () => {
          return await spans.runWithRequestTimeout(
            'action.habits.remove-skip',
            async () => {
              const userId = await requireCheckinUserId('action.habits.remove-skip', baseMeta, spans.timeoutMs)
              const metaWithUser = { ...baseMeta, userId }

              await requireHabitForUserWithRetry({
                habitId: input.habitId,
                userId,
                meta: metaWithUser,
                runWithRetry: spans.runWithRetry,
                actionName: 'action.habits.remove-skip',
              })

              const targetDate = input.dateKey ?? new Date()
              await spans.runWithDbTimeout(
                'action.habits.remove-skip.deleteSkip',
                () => deleteSkip(input.habitId, targetDate),
                metaWithUser
              )

              await revalidateHabitPaths(userId, { sync: true })

              return undefined
            },
            baseMeta
          )
        },
        catch: (error) => error,
      })
    }),
    Result.mapError((error) => serializeActionError(error, 'スキップの解除に失敗しました'))
  )

  return toActionResult(result)
}
