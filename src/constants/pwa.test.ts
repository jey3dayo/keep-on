import { describe, expect, it } from 'vitest'
import { isNonRetryableOfflineCheckinStatus } from './pwa'

describe('isNonRetryableOfflineCheckinStatus', () => {
  it.each([400, 403, 404, 409, 422])('status %s は恒久エラーとして判定する', (status) => {
    expect(isNonRetryableOfflineCheckinStatus(status)).toBe(true)
  })

  it.each([401, 408, 429, 500, 503])('status %s は再試行対象として判定する', (status) => {
    expect(isNonRetryableOfflineCheckinStatus(status)).toBe(false)
  })
})
