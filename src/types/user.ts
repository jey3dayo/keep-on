import type { WeekStart } from '@/constants/habit'

export interface User {
  clerkId: string
  createdAt: Date
  email: string
  id: string
  updatedAt: Date
  weekStart: WeekStart
}
