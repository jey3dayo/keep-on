import * as React from 'react'

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

let mediaQueryList: MediaQueryList | null = null
const subscribers = new Set<() => void>()

const getMediaQueryList = () => {
  if (mediaQueryList) {
    return mediaQueryList
  }
  if (typeof window === 'undefined' || !('matchMedia' in window)) {
    return null
  }
  mediaQueryList = window.matchMedia(MOBILE_QUERY)
  return mediaQueryList
}

const notifySubscribers = () => {
  for (const callback of subscribers) {
    callback()
  }
}

const subscribe = (callback: () => void) => {
  const mql = getMediaQueryList()
  if (!mql) {
    return () => undefined
  }

  subscribers.add(callback)
  if (subscribers.size === 1) {
    mql.addEventListener('change', notifySubscribers)
  }

  return () => {
    subscribers.delete(callback)
    if (subscribers.size === 0) {
      mql.removeEventListener('change', notifySubscribers)
    }
  }
}

const getSnapshot = () => getMediaQueryList()?.matches ?? false

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
