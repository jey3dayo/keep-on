'use server'

import { Result } from '@praha/byethrow'
import { weekStartToDay } from '@/constants/habit'
import { toActionResult } from '@/lib/actions/result'
import { AuthorizationError, UnauthorizedError } from '@/lib/errors/habit'
import { createRequestMeta, formatError, isTimeoutError, logError, logInfo, logSpan, logSpanOptional, logWarn } from '@/lib/logging'
import { resetDb } from '@/lib/db'
import { createCheckin } from '@/lib/queries/checkin'
import { getCheckinCountForPeriod, getHabitById } from '@/lib/queries/habit'
import { getUserWeekStartById } from '@/lib/queries/user'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { getCurrentUserId } from '@/lib/user'
import { type HabitActionResult, revalidateHabitPaths, serializeActionError } from './utils'

function extractDbErrorInfo(error: unknown): { message: string; code?: string; causeCode?: string } {
  const formatted = formatError(error)
  let code: string | undefined
  let causeCode: string | undefined
  let causeMessage: string | undefined

  if (error && typeof error === 'object') {
    const errorCode = (error as { code?: unknown }).code
    if (typeof errorCode === 'string') {
      code = errorCode
    }
    const cause = (error as { cause?: unknown }).cause
    if (cause) {
      const causeFormatted = formatError(cause)
      if (causeFormatted.message && causeFormatted.message !== formatted.message) {
        causeMessage = causeFormatted.message
      }
      const nestedCode = (cause as { code?: unknown }).code
      if (typeof nestedCode === 'string') {
        causeCode = nestedCode
        if (!code) {
          code = nestedCode
        }
      }
    }
  }

  const message = causeMessage ? `${formatted.message} | ${causeMessage}` : formatted.message
  return { message, code, causeCode }
}

export async function addCheckinAction(habitId: string, dateKey?: string): HabitActionResult {
  const requestMeta = createRequestMeta('action.habits.checkin')
  const baseMeta = { ...requestMeta, habitId, dateKey }
  const timeoutMs = getRequestTimeoutMs()
  const dbTimeoutMs = Math.max(3000, Math.min(8000, timeoutMs - 2000))
  const logSpanWithTimeout = <T>(name: string, fn: () => Promise<T>, data?: Record<string, unknown>) =>
    logSpan(name, fn, data, { timeoutMs: dbTimeoutMs })
  const logSpanWithRetry = async <T>(name: string, fn: () => Promise<T>, data?: Record<string, unknown>) => {
    try {
      return await logSpanWithTimeout(name, fn, data)
    } catch (error) {
      if (!isTimeoutError(error)) {
        throw error
      }
      logWarn(`${name}:reset`, data ? { ...data, timeoutMs: dbTimeoutMs } : { timeoutMs: dbTimeoutMs })
      await resetDb(`${name} timeout`)
      return await logSpanWithTimeout(`${name}.retry`, fn, data)
    }
  }

  const result = await Result.try({
    try: async () => {
      return await logSpanWithTimeout(
        'action.habits.checkin',
        async () => {
          // 認証チェック
          const userId = await logSpanOptional(
            'action.habits.checkin.getCurrentUserId',
            () => getCurrentUserId(),
            baseMeta,
            { timeoutMs }
          )
          if (!userId) {
            throw new UnauthorizedError({ detail: '認証されていません' })
          }

          const metaWithUser = { ...baseMeta, userId }

          // habit所有権チェック
          const habit = await logSpanWithRetry(
            'action.habits.checkin.getHabitById',
            () => getHabitById(habitId),
            metaWithUser
          )
          if (!habit) {
            throw new AuthorizationError({ detail: '習慣が見つかりません' })
          }
          if (habit.userId !== userId) {
            throw new AuthorizationError({ detail: 'この習慣にアクセスする権限がありません' })
          }

          const targetDate = dateKey ?? new Date()
          const weekStart = await logSpanWithRetry(
            'action.habits.checkin.getUserWeekStartById',
            () => getUserWeekStartById(userId),
            metaWithUser
          )
          const weekStartDay = weekStartToDay(weekStart)
          const countMeta = {
            ...metaWithUser,
            period: habit.period,
            frequency: habit.frequency,
          }
          const currentCount = await logSpanWithRetry(
            'action.habits.checkin.getCheckinCountForPeriod',
            () => getCheckinCountForPeriod(habitId, targetDate, habit.period, weekStartDay),
            countMeta
          )

          // 達成済みの場合は追加せずに終了
          if (currentCount >= habit.frequency) {
            logInfo('action.habits.checkin.skip', { ...countMeta, currentCount })
            return
          }

          try {
            await logSpanWithTimeout(
              'action.habits.checkin.createCheckin',
              () => createCheckin({ habitId, date: targetDate }),
              countMeta
            )
          } catch (error) {
            if (isTimeoutError(error)) {
              logWarn('action.habits.checkin.createCheckin:reset', { ...countMeta, timeoutMs: dbTimeoutMs })
              await resetDb('action.habits.checkin.createCheckin timeout')
            }
            const { message, code, causeCode } = extractDbErrorInfo(error)
            const normalized = message.toLowerCase()
            if (code || causeCode || normalized.includes('failed query')) {
              logError('action.habits.checkin.createCheckin:db-error', {
                ...countMeta,
                code,
                causeCode,
                error: formatError(error),
              })
            }
            throw error
          }
          revalidateHabitPaths()
          return
        },
        baseMeta
      )
    },
    catch: (error) => serializeActionError(error, 'チェックインの切り替えに失敗しました'),
  })()

  return toActionResult(result)
}
