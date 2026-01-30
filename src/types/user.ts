import type { WeekStart } from '@/constants/habit'

export interface User {
  id: string
  clerkId: string
  email: string
  weekStart: WeekStart
  createdAt: Date
  updatedAt: Date
}
