import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, RefObject, TransitionEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PAGE_SWIPE_DISTANCE_THRESHOLD_RATIO,
  PAGE_SWIPE_INTENT_THRESHOLD_PX,
  PAGE_SWIPE_RUBBER_BAND_FACTOR,
  PAGE_SWIPE_TRANSITION_DURATION_MS,
  PAGE_SWIPE_VELOCITY_STALE_TIMEOUT_MS,
  PAGE_SWIPE_VELOCITY_THRESHOLD_PX_PER_MS,
} from '@/constants/interaction'

export type SwipeIntent = 'horizontal' | 'vertical' | 'undetermined'

interface PageSwipeTargetParams {
  containerWidth: number
  currentPage: number
  distance: number
  totalPages: number
  velocity: number
}

interface PageSwipeOptions {
  currentPage: number
  onPageChange: (page: number) => void
  totalPages: number
}

interface PageSwipeHandlers {
  animateToPage: (page: number) => void
  cancelSwipe: () => void
  containerRef: RefObject<HTMLDivElement | null>
  handleClickCapture: (event: MouseEvent<HTMLDivElement>) => void
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  handlePointerCancel: (event: PointerEvent<HTMLDivElement>) => void
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void
  handlePointerUp: (event: PointerEvent<HTMLDivElement>) => void
  handleTransitionEnd: (event: TransitionEvent<HTMLDivElement>) => void
  isSnapping: boolean
  trackStyle: CSSProperties
}

interface ActivePointer {
  containerWidth: number
  intent: SwipeIntent
  lastTime: number
  lastX: number
  pointerId: number
  startX: number
  startY: number
  velocity: number
}

const clampPage = (page: number, totalPages: number) => Math.max(0, Math.min(page, totalPages - 1))

const getEventTime = (event: PointerEvent<HTMLDivElement>) =>
  Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now()

/** 移動方向が水平・垂直のどちらかに十分偏るまで意図を未確定に保つ */
export function getSwipeIntent(
  deltaX: number,
  deltaY: number,
  threshold = PAGE_SWIPE_INTENT_THRESHOLD_PX
): SwipeIntent {
  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)
  if (absX <= threshold && absY <= threshold) {
    return 'undetermined'
  }
  if (absX > absY) {
    return 'horizontal'
  }
  return 'vertical'
}

/**
 * 指を離した時点の距離と速度から移動先ページを決める。
 * 速度がある場合は距離と逆向きのフリックを無効にし、意図しないページ移動を防ぐ。
 */
export function getPageSwipeTarget({
  containerWidth,
  currentPage,
  distance,
  totalPages,
  velocity,
}: PageSwipeTargetParams): number {
  if (containerWidth <= 0 || totalPages <= 1 || distance === 0) {
    return currentPage
  }

  const distanceDirection = Math.sign(distance)
  const velocityMatchesDistance = velocity === 0 || Math.sign(velocity) === distanceDirection
  if (!velocityMatchesDistance) {
    return currentPage
  }

  const distanceThreshold = containerWidth * PAGE_SWIPE_DISTANCE_THRESHOLD_RATIO
  const passedDistanceThreshold = Math.abs(distance) > distanceThreshold
  const passedVelocityThreshold = Math.abs(velocity) > PAGE_SWIPE_VELOCITY_THRESHOLD_PX_PER_MS
  if (!(passedDistanceThreshold || passedVelocityThreshold)) {
    return currentPage
  }

  // Pointer が右へ動いたら前ページ、左へ動いたら次ページへ進む。
  const targetPage = currentPage - distanceDirection
  return clampPage(targetPage, totalPages)
}

/** 端の外向き操作だけを減衰させ、ページがないことを連続的に伝える */
export function getPageSwipeOffset(
  distance: number,
  containerWidth: number,
  currentPage: number,
  totalPages: number
): number {
  const isOutwardAtStart = currentPage === 0 && distance > 0
  const isOutwardAtEnd = currentPage === totalPages - 1 && distance < 0
  if (!(containerWidth > 0 && (isOutwardAtStart || isOutwardAtEnd))) {
    return distance
  }

  const absoluteDistance = Math.abs(distance)
  const dampedDistance =
    (absoluteDistance * containerWidth * PAGE_SWIPE_RUBBER_BAND_FACTOR) /
    (containerWidth + PAGE_SWIPE_RUBBER_BAND_FACTOR * absoluteDistance)
  return Math.sign(distance) * dampedDistance
}

export function usePageSwipe({ currentPage, onPageChange, totalPages }: PageSwipeOptions): PageSwipeHandlers {
  const [dragOffset, setDragOffset] = useState(0)
  const [isSnapping, setIsSnapping] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activePointerRef = useRef<ActivePointer | null>(null)
  const currentPageRef = useRef(currentPage)
  const previousTotalPagesRef = useRef(totalPages)
  const pointerCaptureTargetRef = useRef<Element | null>(null)
  const didSwipeRef = useRef(false)
  const onPageChangeRef = useRef(onPageChange)
  const pendingPageRef = useRef<number | null>(null)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  currentPageRef.current = currentPage
  onPageChangeRef.current = onPageChange

  const clearSnapTimer = useCallback(() => {
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current)
      snapTimerRef.current = null
    }
  }, [])

  const releasePointerCapture = useCallback((pointerId: number | undefined) => {
    const target = pointerCaptureTargetRef.current
    if (target && pointerId !== undefined && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    pointerCaptureTargetRef.current = null
  }, [])

  const completeSnap = useCallback(() => {
    clearSnapTimer()
    const pendingPage = pendingPageRef.current
    pendingPageRef.current = null
    setIsSnapping(false)
    setDragOffset(0)
    if (pendingPage !== null && pendingPage !== currentPageRef.current) {
      onPageChangeRef.current(pendingPage)
    }
  }, [clearSnapTimer])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches)
      if (mediaQuery.matches) {
        completeSnap()
      }
    }
    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [completeSnap])

  useEffect(() => {
    if (previousTotalPagesRef.current === totalPages) {
      return
    }
    previousTotalPagesRef.current = totalPages
    clearSnapTimer()
    releasePointerCapture(activePointerRef.current?.pointerId)
    activePointerRef.current = null
    pendingPageRef.current = null
    didSwipeRef.current = false
    setDragOffset(0)
    setIsSnapping(false)
  }, [clearSnapTimer, releasePointerCapture, totalPages])

  useEffect(() => clearSnapTimer, [clearSnapTimer])

  useEffect(() => {
    if (pendingPageRef.current === null || pendingPageRef.current === currentPage) {
      return
    }
    clearSnapTimer()
    pendingPageRef.current = null
    setDragOffset(0)
    setIsSnapping(false)
  }, [clearSnapTimer, currentPage])

  const resetInteraction = useCallback(() => {
    clearSnapTimer()
    releasePointerCapture(activePointerRef.current?.pointerId)
    activePointerRef.current = null
    pendingPageRef.current = null
    setDragOffset(0)
    setIsSnapping(false)
  }, [clearSnapTimer, releasePointerCapture])

  const cancelSwipe = useCallback(() => {
    didSwipeRef.current = false
    resetInteraction()
  }, [resetInteraction])

  const settleInteraction = useCallback(
    (targetPage: number, containerWidth: number) => {
      const page = clampPage(targetPage, totalPages)
      clearSnapTimer()
      if (prefersReducedMotion || containerWidth <= 0) {
        pendingPageRef.current = null
        setDragOffset(0)
        setIsSnapping(false)
        if (page !== currentPageRef.current) {
          onPageChangeRef.current(page)
        }
        return
      }

      if (page === currentPageRef.current && dragOffset === 0) {
        pendingPageRef.current = null
        setIsSnapping(false)
        return
      }

      pendingPageRef.current = page
      setIsSnapping(true)
      if (page === currentPageRef.current) {
        setDragOffset(0)
        snapTimerRef.current = setTimeout(completeSnap, PAGE_SWIPE_TRANSITION_DURATION_MS + 50)
        return
      }

      setDragOffset((currentPageRef.current - page) * containerWidth)
      snapTimerRef.current = setTimeout(completeSnap, PAGE_SWIPE_TRANSITION_DURATION_MS + 50)
    },
    [clearSnapTimer, completeSnap, dragOffset, prefersReducedMotion, totalPages]
  )

  const animateToPage = useCallback(
    (targetPage: number) => {
      if (activePointerRef.current) {
        return
      }

      const page = clampPage(targetPage, totalPages)
      if (page === currentPageRef.current) {
        return
      }

      const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 0
      settleInteraction(page, containerWidth)
    },
    [settleInteraction, totalPages]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (activePointerRef.current) {
        return
      }

      let direction = 0
      if (event.key === 'ArrowLeft') {
        direction = -1
      } else if (event.key === 'ArrowRight') {
        direction = 1
      }
      if (direction === 0) {
        return
      }

      const targetPage = currentPageRef.current + direction
      if (targetPage < 0 || targetPage >= totalPages) {
        return
      }

      event.preventDefault()
      animateToPage(targetPage)
    },
    [animateToPage, totalPages]
  )

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!event.isPrimary || totalPages <= 1 || activePointerRef.current) {
        return
      }
      didSwipeRef.current = false
      if (isSnapping) {
        return
      }
      const now = getEventTime(event)
      const captureTarget = event.target instanceof Element ? event.target : event.currentTarget
      captureTarget.setPointerCapture(event.pointerId)
      pointerCaptureTargetRef.current = captureTarget
      activePointerRef.current = {
        containerWidth: event.currentTarget.getBoundingClientRect().width,
        intent: 'undetermined',
        lastTime: now,
        lastX: event.clientX,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        velocity: 0,
      }
      setIsSnapping(false)
    },
    [isSnapping, totalPages]
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const activePointer = activePointerRef.current
      if (!(activePointer && event.isPrimary)) {
        return
      }

      const deltaX = event.clientX - activePointer.startX
      const deltaY = event.clientY - activePointer.startY
      if (activePointer.intent === 'undetermined') {
        activePointer.intent = getSwipeIntent(deltaX, deltaY)
        if (activePointer.intent === 'horizontal') {
          didSwipeRef.current = true
        }
      }

      if (activePointer.intent !== 'horizontal') {
        return
      }

      event.preventDefault()
      const now = getEventTime(event)
      const elapsed = Math.max(now - activePointer.lastTime, 1)
      activePointer.velocity = (event.clientX - activePointer.lastX) / elapsed
      activePointer.lastTime = now
      activePointer.lastX = event.clientX
      setDragOffset(getPageSwipeOffset(deltaX, activePointer.containerWidth, currentPageRef.current, totalPages))
    },
    [totalPages]
  )

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const activePointer = activePointerRef.current
      if (!(activePointer && event.isPrimary)) {
        return
      }
      activePointerRef.current = null
      releasePointerCapture(event.pointerId)
      if (activePointer.intent !== 'horizontal') {
        setDragOffset(0)
        return
      }

      const distance = event.clientX - activePointer.startX
      const elapsedSinceLastMove = Math.max(getEventTime(event) - activePointer.lastTime, 0)
      const distanceSinceLastMove = event.clientX - activePointer.lastX
      let velocity = activePointer.velocity
      if (distanceSinceLastMove !== 0 && elapsedSinceLastMove > 0) {
        velocity = distanceSinceLastMove / elapsedSinceLastMove
      } else if (elapsedSinceLastMove > PAGE_SWIPE_VELOCITY_STALE_TIMEOUT_MS) {
        velocity = 0
      }
      const targetPage = getPageSwipeTarget({
        containerWidth: activePointer.containerWidth,
        currentPage: currentPageRef.current,
        distance,
        totalPages,
        velocity,
      })
      settleInteraction(targetPage, activePointer.containerWidth)
    },
    [releasePointerCapture, settleInteraction, totalPages]
  )

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current && event.isPrimary) {
        didSwipeRef.current = false
        releasePointerCapture(event.pointerId)
        resetInteraction()
      }
    },
    [releasePointerCapture, resetInteraction]
  )

  const handleTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || event.propertyName !== 'transform' || !isSnapping) {
        return
      }
      completeSnap()
    },
    [completeSnap, isSnapping]
  )

  const handleClickCapture = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!didSwipeRef.current) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    didSwipeRef.current = false
  }, [])

  const trackStyle: CSSProperties = {
    transform: `translate3d(calc(-${currentPage * (100 / Math.max(totalPages, 1))}% + ${dragOffset}px), 0, 0)`,
    transitionDuration: isSnapping ? `${PAGE_SWIPE_TRANSITION_DURATION_MS}ms` : undefined,
    width: `${Math.max(totalPages, 1) * 100}%`,
  }

  return {
    animateToPage,
    cancelSwipe,
    containerRef,
    handleClickCapture,
    handleKeyDown,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTransitionEnd,
    isSnapping,
    trackStyle,
  }
}
