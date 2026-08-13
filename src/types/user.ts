import type { WeekStart } from '@/constants/habit'

export interface User {
  createdAt: Date
  email: string
  /** 外部 IdP のサブジェクト識別子 (Cloudflare Access JWT の sub) */
  externalId: string
  id: string
  updatedAt: Date
  weekStart: WeekStart
}
