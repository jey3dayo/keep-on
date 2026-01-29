import { actionOk } from '@/lib/actions/result'

export function archiveHabitAction(_habitId: string) {
  return Promise.resolve(actionOk())
}

export function deleteHabitAction(_habitId: string) {
  return Promise.resolve(actionOk())
}

export function unarchiveHabitAction(_habitId: string) {
  return Promise.resolve(actionOk())
}

export function updateHabitAction(_habitId: string, _formData: FormData) {
  return Promise.resolve(actionOk())
}

export function createHabit(_formData: FormData) {
  return Promise.resolve(actionOk())
}

export function toggleCheckinAction(_habitId: string, _dateKey?: string) {
  return Promise.resolve(actionOk())
}

export function resetHabitProgressAction(_habitId: string) {
  return Promise.resolve(actionOk())
}

export function updateWeekStartAction(_weekStart: unknown) {
  return Promise.resolve(actionOk())
}
