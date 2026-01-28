import { Result } from '@praha/byethrow'

export function archiveHabitAction(_habitId: string) {
  return Promise.resolve(Result.succeed(undefined))
}

export function deleteHabitAction(_habitId: string) {
  return Promise.resolve(Result.succeed(undefined))
}

export function unarchiveHabitAction(_habitId: string) {
  return Promise.resolve(Result.succeed(undefined))
}

export function updateHabitAction(_habitId: string, _formData: FormData) {
  return Promise.resolve(Result.succeed(undefined))
}

export function createHabit(_formData: FormData) {
  return Promise.resolve(Result.succeed(undefined))
}

export function toggleCheckinAction(_habitId: string, _dateKey?: string) {
  return Promise.resolve(Result.succeed(undefined))
}

export function resetHabitProgressAction(_habitId: string) {
  return Promise.resolve(Result.succeed(undefined))
}

export function updateWeekStartAction(_weekStart: unknown) {
  return Promise.resolve(undefined)
}
