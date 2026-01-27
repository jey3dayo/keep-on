import { type CookieOptions, safeParseCookieOptions } from '@/schemas/cookies'

export function getClientCookie(key: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const entries = document.cookie ? document.cookie.split('; ') : []
  for (const entry of entries) {
    const separatorIndex = entry.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }
    const name = entry.slice(0, separatorIndex)
    if (name !== key) {
      continue
    }
    const value = entry.slice(separatorIndex + 1)
    return decodeURIComponent(value)
  }

  return null
}

export function setClientCookie(key: string, value: string, options: CookieOptions = {}) {
  if (typeof document === 'undefined') {
    return
  }

  const parsed = safeParseCookieOptions(options)
  const safeOptions = parsed.success ? parsed.output : {}

  const parts = [`${key}=${encodeURIComponent(value)}`]
  const path = safeOptions.path ?? '/'
  parts.push(`path=${path}`)

  if (typeof safeOptions.maxAge === 'number') {
    parts.push(`max-age=${safeOptions.maxAge}`)
  }

  if (safeOptions.sameSite) {
    parts.push(`samesite=${safeOptions.sameSite}`)
  }

  if ('cookieStore' in window) {
    const cookieStore = window.cookieStore
    cookieStore.set({
      name: key,
      value,
      path,
      sameSite: safeOptions.sameSite,
      expires: typeof safeOptions.maxAge === 'number' ? Date.now() + safeOptions.maxAge * 1000 : undefined,
    })
    return
  }

  // biome-ignore lint/suspicious/noDocumentCookie: Fallback for browsers without Cookie Store API.
  document.cookie = parts.join('; ')
}
