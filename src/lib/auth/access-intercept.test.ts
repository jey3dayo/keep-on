import { describe, expect, it } from 'vitest'
import { isAuthInterceptedResponse } from '@/lib/auth/access-intercept'

describe('isAuthInterceptedResponse', () => {
  it('redirected なら true', () => {
    const res = new Response('ok', { headers: { 'content-type': 'application/json' }, status: 200 })
    Object.defineProperty(res, 'redirected', { value: true })
    expect(isAuthInterceptedResponse(res)).toBe(true)
  })

  it('JSON なら false', () => {
    const res = new Response('{}', { headers: { 'content-type': 'application/json' }, status: 200 })
    expect(isAuthInterceptedResponse(res)).toBe(false)
  })

  it('非 JSON（Access HTML 等）なら true', () => {
    const res = new Response('<html></html>', { headers: { 'content-type': 'text/html' }, status: 200 })
    expect(isAuthInterceptedResponse(res)).toBe(true)
  })
})
