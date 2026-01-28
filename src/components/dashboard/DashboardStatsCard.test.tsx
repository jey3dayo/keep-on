import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardStatsCard } from './DashboardStatsCard'

describe('DashboardStatsCard', () => {
  describe('Progressタイプ', () => {
    it('進捗状況が表示される', () => {
      render(<DashboardStatsCard total={8} type="progress" value={5} />)

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('/ 8')).toBeInTheDocument()
      expect(screen.getByText('今日の進捗')).toBeInTheDocument()
    })

    it('完了時の表示', () => {
      render(<DashboardStatsCard total={8} type="progress" value={8} />)

      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('/ 8')).toBeInTheDocument()
    })

    it('ゼロの表示', () => {
      render(<DashboardStatsCard total={5} type="progress" value={0} />)

      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('/ 5')).toBeInTheDocument()
    })
  })

  describe('Streakタイプ', () => {
    it('ストリーク数が表示される', () => {
      render(<DashboardStatsCard suffix="日" type="streak" value={12} />)

      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('日')).toBeInTheDocument()
    })

    it('長期ストリークの表示', () => {
      render(<DashboardStatsCard suffix="日" type="streak" value={100} />)

      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('ゼロストリークの表示', () => {
      render(<DashboardStatsCard suffix="日" type="streak" value={0} />)

      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })
})
