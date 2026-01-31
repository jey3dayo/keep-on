import { describe, expect, it } from 'vitest'
import { buildCacheKey, serializeCacheData, validateCachedData } from '../analytics-cache.pure'

describe('analytics-cache.pure', () => {
  describe('buildCacheKey', () => {
    it('should generate correct cache key with userId', () => {
      const userId = 'user-123'
      const key = buildCacheKey(userId)

      expect(key).toBe('analytics:total-checkins:user-123')
    })

    it('should handle different userIds', () => {
      expect(buildCacheKey('user-1')).toBe('analytics:total-checkins:user-1')
      expect(buildCacheKey('user-abc')).toBe('analytics:total-checkins:user-abc')
    })
  })

  describe('serializeCacheData', () => {
    it('should serialize total checkins to JSON string', () => {
      const total = 42
      const serialized = serializeCacheData(total)
      const parsed = JSON.parse(serialized)

      expect(parsed.total).toBe(42)
      expect(typeof parsed.timestamp).toBe('number')
      expect(parsed.timestamp).toBeGreaterThan(0)
    })

    it('should handle zero', () => {
      const serialized = serializeCacheData(0)
      const parsed = JSON.parse(serialized)

      expect(parsed.total).toBe(0)
    })

    it('should handle large numbers', () => {
      const total = 999_999
      const serialized = serializeCacheData(total)
      const parsed = JSON.parse(serialized)

      expect(parsed.total).toBe(999_999)
    })
  })

  describe('validateCachedData', () => {
    it('should return total when data is valid', () => {
      const validData = { total: 42, timestamp: Date.now() }
      const result = validateCachedData(validData)

      expect(result).toBe(42)
    })

    it('should return null when data is null', () => {
      const result = validateCachedData(null)

      expect(result).toBeNull()
    })

    it('should return null when data is undefined', () => {
      const result = validateCachedData(undefined)

      expect(result).toBeNull()
    })

    it('should return null when total is missing', () => {
      const invalidData = { timestamp: Date.now() }
      const result = validateCachedData(invalidData)

      expect(result).toBeNull()
    })

    it('should return null when total is negative', () => {
      const invalidData = { total: -1, timestamp: Date.now() }
      const result = validateCachedData(invalidData)

      expect(result).toBeNull()
    })

    it('should return null when total is not an integer', () => {
      const invalidData = { total: 42.5, timestamp: Date.now() }
      const result = validateCachedData(invalidData)

      expect(result).toBeNull()
    })

    it('should return null when total is not a number', () => {
      const invalidData = { total: '42', timestamp: Date.now() }
      const result = validateCachedData(invalidData)

      expect(result).toBeNull()
    })

    it('should return null when timestamp is missing', () => {
      const invalidData = { total: 42 }
      const result = validateCachedData(invalidData)

      expect(result).toBeNull()
    })

    it('should handle zero total', () => {
      const validData = { total: 0, timestamp: Date.now() }
      const result = validateCachedData(validData)

      expect(result).toBe(0)
    })
  })
})
