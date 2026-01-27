type CookieSameSite = 'lax' | 'strict' | 'none'

interface CookieOptions {
  path?: string
  maxAge?: number
  sameSite?: CookieSameSite
}

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

  const parts = [`${key}=${encodeURIComponent(value)}`]
  const path = options.path ?? '/'
  parts.push(`path=${path}`)

  if (typeof options.maxAge === 'number') {
    parts.push(`max-age=${options.maxAge}`)
  }

  if (options.sameSite) {
    parts.push(`samesite=${options.sameSite}`)
  }

  document.cookie = parts.join('; ')
}
