'use server'

import { createSkip, deleteSkip } from '@/lib/queries/skip'
import { type HabitCheckinSpans, requireHabitForUserWithRetry } from './checkin-shared'
import {
  type HabitActionResult,
  type ResolvedHabitActionInput,
  revalidateHabitPaths,
  runTimedHabitAction,
} from './utils'

interface SkipMutationOptions<TDbResult, TResult> {
  actionName: string
  dbActionName: string
  mapResult: (result: TDbResult) => TResult
  mutate: (habitId: string, targetDate: Date | string) => Promise<TDbResult>
}

async function performSkipMutation<TDbResult, TResult>(
  input: ResolvedHabitActionInput,
  baseMeta: Record<string, unknown>,
  spans: HabitCheckinSpans,
  userId: string,
  options: SkipMutationOptions<TDbResult, TResult>
): Promise<TResult> {
  const metaWithUser = { ...baseMeta, userId }

  await requireHabitForUserWithRetry({
    actionName: options.actionName,
    habitId: input.habitId,
    meta: metaWithUser,
    runWithRetry: spans.runWithRetry,
    userId,
  })

  const targetDate = input.dateKey
  const mutationResult = await spans.runWithDbTimeout(
    options.dbActionName,
    () => options.mutate(input.habitId, targetDate),
    metaWithUser
  )

  await revalidateHabitPaths(userId, { sync: true })

  return options.mapResult(mutationResult)
}

export async function addSkipAction(
  habitId: string,
  dateKey?: string,
  occurredAt?: string
): HabitActionResult<{ skipped: boolean }> {
  return await runTimedHabitAction(
    { dateKey, habitId, occurredAt },
    {
      actionName: 'action.habits.skip',
      buildBaseMeta: (input, requestMeta) => ({ ...requestMeta, habitId: input.habitId }),
      errorDetail: 'スキップの設定に失敗しました',
      run: async ({ input, baseMeta, spans, userId }) =>
        await performSkipMutation(input, baseMeta, spans, userId, {
          actionName: 'action.habits.skip',
          dbActionName: 'action.habits.skip.createSkip',
          mapResult: (skip) => ({ skipped: skip !== null }),
          mutate: createSkip,
        }),
    }
  )
}

export async function removeSkipAction(habitId: string, dateKey?: string, occurredAt?: string): HabitActionResult {
  return await runTimedHabitAction(
    { dateKey, habitId, occurredAt },
    {
      actionName: 'action.habits.remove-skip',
      buildBaseMeta: (input, requestMeta) => ({ ...requestMeta, habitId: input.habitId }),
      errorDetail: 'スキップの解除に失敗しました',
      run: async ({ input, baseMeta, spans, userId }) =>
        await performSkipMutation(input, baseMeta, spans, userId, {
          actionName: 'action.habits.remove-skip',
          dbActionName: 'action.habits.remove-skip.deleteSkip',
          mapResult: () => undefined,
          mutate: deleteSkip,
        }),
    }
  )
}
