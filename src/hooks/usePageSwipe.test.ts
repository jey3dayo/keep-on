import { describe, expect, it } from 'vitest'
import { PAGE_SWIPE_VELOCITY_THRESHOLD_PX_PER_MS } from '@/constants/interaction'
import { getPageSwipeOffset, getPageSwipeTarget, getSwipeIntent } from './usePageSwipe'

describe('getSwipeIntent', () => {
  it('移動量が閾値以下の間はページを動かさない', () => {
    expect(getSwipeIntent(10, 0)).toBe('undetermined')
    expect(getSwipeIntent(4, 8)).toBe('undetermined')
  })

  it('横方向の移動が確定するまで垂直スクロールを優先する', () => {
    expect(getSwipeIntent(24, 8)).toBe('horizontal')
    expect(getSwipeIntent(8, 24)).toBe('vertical')
  })
})

describe('getPageSwipeTarget', () => {
  const base = {
    containerWidth: 400,
    currentPage: 1,
    totalPages: 3,
  }

  it('距離がコンテナ幅の25%を超えると方向に応じて移動する', () => {
    expect(getPageSwipeTarget({ ...base, distance: 101, velocity: 0 })).toBe(0)
    expect(getPageSwipeTarget({ ...base, distance: -101, velocity: 0 })).toBe(2)
  })

  it('距離が閾値ちょうどの場合は移動しない', () => {
    expect(getPageSwipeTarget({ ...base, distance: 100, velocity: 0 })).toBe(base.currentPage)
  })

  it('距離が短くても速度が閾値を超えれば移動する', () => {
    expect(
      getPageSwipeTarget({
        ...base,
        distance: -40,
        velocity: -(PAGE_SWIPE_VELOCITY_THRESHOLD_PX_PER_MS + 0.01),
      })
    ).toBe(2)
  })

  it('速度が閾値ちょうどの場合は移動しない', () => {
    expect(
      getPageSwipeTarget({
        ...base,
        distance: -40,
        velocity: -PAGE_SWIPE_VELOCITY_THRESHOLD_PX_PER_MS,
      })
    ).toBe(base.currentPage)
  })

  it('速度の符号が距離方向と異なる場合は移動しない', () => {
    expect(getPageSwipeTarget({ ...base, distance: -40, velocity: 0.31 })).toBe(base.currentPage)
    expect(getPageSwipeTarget({ ...base, distance: 120, velocity: -0.31 })).toBe(base.currentPage)
  })

  it('先頭・末尾では外向きの移動先を現在ページに留める', () => {
    expect(getPageSwipeTarget({ containerWidth: 400, currentPage: 0, distance: 200, totalPages: 3, velocity: 0 })).toBe(
      0
    )
    expect(
      getPageSwipeTarget({ containerWidth: 400, currentPage: 2, distance: -200, totalPages: 3, velocity: 0 })
    ).toBe(2)
  })
})

describe('getPageSwipeOffset', () => {
  it('端の外向き移動だけをラバーバンドで減衰する', () => {
    expect(getPageSwipeOffset(120, 400, 0, 3)).toBeLessThan(120)
    expect(getPageSwipeOffset(-120, 400, 1, 3)).toBe(-120)
  })
})
