import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWeekStart } from './use-week-start'

describe('useWeekStart', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('保存値がない場合はmondayを返す', async () => {
    const { result } = renderHook(() => useWeekStart())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    expect(result.current.weekStart).toBe('monday')
  })

  it('保存済みの値を復元する', async () => {
    localStorage.setItem('week-start', 'sunday')

    const { result } = renderHook(() => useWeekStart())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    expect(result.current.weekStart).toBe('sunday')
  })

  it('不正な値の場合はmondayにフォールバックする', async () => {
    localStorage.setItem('week-start', 'tuesday')

    const { result } = renderHook(() => useWeekStart())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    expect(result.current.weekStart).toBe('monday')
  })

  it('setWeekStartで状態とlocalStorageを更新する', async () => {
    const { result } = renderHook(() => useWeekStart())

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
    })

    act(() => {
      result.current.setWeekStart('sunday')
    })

    expect(result.current.weekStart).toBe('sunday')
    expect(localStorage.getItem('week-start')).toBe('sunday')
  })
})
