import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HabitWithProgress } from '@/types/habit'
import type { User } from '@/types/user'
import { DesktopDashboard } from './DesktopDashboard'

// HabitActionDrawer は dynamic(ssr:false) 経由で読み込まれ、このテストの関心事と無関係なため最小化する
vi.mock('@/components/dashboard/HabitActionDrawer', () => ({
  HabitActionDrawer: () => null,
}))

const user: User = {
  createdAt: new Date('2026-01-01'),
  email: 'test@example.com',
  externalId: 'ext-1',
  id: 'user-1',
  updatedAt: new Date('2026-01-01'),
  weekStart: 'monday',
}

const habit: HabitWithProgress = {
  archived: false,
  archivedAt: null,
  color: null,
  completionRate: 0,
  createdAt: '2026-01-01',
  currentProgress: 0,
  frequency: 1,
  icon: null,
  id: 'habit-1',
  name: 'テスト習慣',
  period: 'daily',
  reminderTime: null,
  skippedToday: false,
  streak: 0,
  updatedAt: '2026-01-01',
  userId: 'user-1',
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('DesktopDashboard (simple view)', () => {
  it('does not portal DashboardBottomBar into document.body', async () => {
    render(
      <DesktopDashboard currentView="simple" habits={[habit]} onViewChange={vi.fn()} todayLabel="8月13日" user={user} />
    )

    // DashboardBottomBar は useEffect で mounted になった後に createPortal(document.body) する。
    // showBottomBar={false} により HabitSimpleView 側でマウント自体が抑止されることを固定する。
    await waitFor(() => {
      expect(document.querySelector('[aria-label="設定を開く"]')).not.toBeInTheDocument()
    })
  })
})
