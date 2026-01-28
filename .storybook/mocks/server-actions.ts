import { Result } from '@praha/byethrow'

export async function archiveHabitAction(_habitId: string) {
  return Result.succeed(undefined)
}

export async function deleteHabitAction(_habitId: string) {
  return Result.succeed(undefined)
}

export async function unarchiveHabitAction(_habitId: string) {
  return Result.succeed(undefined)
}

export async function updateHabitAction(_habitId: string, _formData: FormData) {
  return Result.succeed(undefined)
}

export async function createHabit(_formData: FormData) {
  return Result.succeed(undefined)
}

export async function toggleCheckinAction(_habitId: string, _dateKey?: string) {
  return Result.succeed(undefined)
}

export async function updateWeekStartAction(_weekStart: unknown) {
  return undefined
}
