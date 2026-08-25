import { render, screen, waitFor } from '@testing-library/react'
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
  it('does not render mobile page dots or the tab bar', async () => {
    const desktopHabits = Array.from({ length: 7 }, (_, index) => ({ ...habit, id: `habit-${index}` }))

    render(
      <DesktopDashboard
        currentView="simple"
        habits={desktopHabits}
        onViewChange={vi.fn()}
        todayLabel="8月13日"
        user={user}
      />
    )

    // デスクトップ経路ではモバイル用の設定ピル・ページドット・タブバーを描画しない契約を固定する。
    await waitFor(() => {
      expect(document.querySelector('[aria-label="設定を開く"]')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'ページ 1' })).not.toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'メインナビゲーション' })).not.toBeInTheDocument()
    })
  })
})
