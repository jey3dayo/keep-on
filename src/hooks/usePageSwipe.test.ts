import { fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PAGE_SWIPE_VELOCITY_THRESHOLD_PX_PER_MS } from '@/constants/interaction'
import { getPageSwipeOffset, getPageSwipeTarget, getSwipeIntent, usePageSwipe } from './usePageSwipe'

interface PageSwipeHarnessProps {
  onCheckin: () => void
  onPageChange: (page: number) => void
}

function PageSwipeHarness({ onCheckin, onPageChange }: PageSwipeHarnessProps) {
  const {
    animateToPage,
    containerRef,
    handleClickCapture,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTransitionEnd,
    trackStyle,
  } = usePageSwipe({ currentPage: 0, onPageChange, totalPages: 3 })

  return createElement(
    'div',
    null,
    createElement(
      'div',
      {
        'data-testid': 'container',
        onClickCapture: handleClickCapture,
        onPointerCancel: handlePointerCancel,
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        ref: containerRef,
      },
      createElement(
        'div',
        {
          'data-testid': 'track',
          'data-transform': trackStyle.transform,
          onTransitionEnd: handleTransitionEnd,
          style: trackStyle,
        },
        createElement('button', { 'data-testid': 'checkin', onClick: onCheckin, type: 'button' }, 'チェックイン')
      )
    ),
    createElement('button', { 'data-testid': 'page-two', onClick: () => animateToPage(2), type: 'button' }, '3ページ目')
  )
}

function installPointerCapture(element: HTMLElement) {
  const capturedPointerIds = new Set<number>()
  element.getBoundingClientRect = () => new DOMRect(0, 0, 400, 100)
  element.setPointerCapture = (pointerId) => {
    capturedPointerIds.add(pointerId)
  }
  element.hasPointerCapture = (pointerId) => capturedPointerIds.has(pointerId)
  element.releasePointerCapture = (pointerId) => {
    capturedPointerIds.delete(pointerId)
  }
}

function swipeToNextPage(container: HTMLElement) {
  fireEvent.pointerDown(container, { clientX: 200, clientY: 100, isPrimary: true, pointerId: 1 })
  fireEvent.pointerMove(container, { clientX: 0, clientY: 100, isPrimary: true, pointerId: 1 })
  fireEvent.pointerUp(container, { clientX: 0, clientY: 100, isPrimary: true, pointerId: 1 })
}

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

describe('usePageSwipe の操作中インタラクション', () => {
  it('スナップ中の新しいタップは直前スワイプのクリック抑制を解除してチェックインを通す', () => {
    const onCheckin = vi.fn()
    const onPageChange = vi.fn()
    render(createElement(PageSwipeHarness, { onCheckin, onPageChange }))
    const container = screen.getByTestId('container')
    const checkin = screen.getByTestId('checkin')
    installPointerCapture(container)

    swipeToNextPage(container)
    fireEvent.pointerDown(checkin, { clientX: 100, clientY: 100, isPrimary: true, pointerId: 2 })
    fireEvent.click(checkin)

    expect(onCheckin).toHaveBeenCalledTimes(1)
  })

  it('スナップ中のページドット操作は新しいページへ retarget する', () => {
    const onCheckin = vi.fn()
    const onPageChange = vi.fn()
    render(createElement(PageSwipeHarness, { onCheckin, onPageChange }))
    const container = screen.getByTestId('container')
    const track = screen.getByTestId('track')
    installPointerCapture(container)

    swipeToNextPage(container)
    const transformAfterSwipe = track.getAttribute('data-transform')
    fireEvent.click(screen.getByTestId('page-two'))

    expect(transformAfterSwipe).toContain('-400px')
    expect(track.getAttribute('data-transform')).toContain('-800px')
  })

  it('通常のスワイプ直後は誤クリックを抑制する', () => {
    const onCheckin = vi.fn()
    const onPageChange = vi.fn()
    render(createElement(PageSwipeHarness, { onCheckin, onPageChange }))
    const container = screen.getByTestId('container')
    const checkin = screen.getByTestId('checkin')
    installPointerCapture(container)

    swipeToNextPage(container)
    fireEvent.click(checkin)

    expect(onCheckin).not.toHaveBeenCalled()
  })
})
