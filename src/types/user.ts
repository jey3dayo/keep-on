import type { DayStartHour, WeekStart } from '@/constants/habit'

export interface User {
  createdAt: Date
  /** 日付が切り替わる時刻 (24-29時、24は暦どおり) */
  dayStartHour: DayStartHour
  email: string
  /** 外部 IdP のサブジェクト識別子 (Cloudflare Access JWT の sub) */
  externalId: string
  id: string
  updatedAt: Date
  weekStart: WeekStart
}
