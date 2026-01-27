import { describe, expect, it } from 'vitest'
import { getRingColorFromBackground } from '@/lib/utils/color'

describe('getRingColorFromBackground', () => {
  it('oklch(1 0 0) は mix ratio に応じたグレーになる', () => {
    expect(getRingColorFromBackground('oklch(1 0 0)')).toBe('rgb(158 158 158)')
    expect(getRingColorFromBackground('oklch(1 0 0)', 0.5)).toBe('rgb(128 128 128)')
    expect(getRingColorFromBackground('oklch(1 0 0)', 1)).toBe('rgb(255 255 255)')
    expect(getRingColorFromBackground('oklch(1 0 0)', 0)).toBe('rgb(0 0 0)')
  })

  it('oklch 以外は fallback を返す', () => {
    expect(getRingColorFromBackground('rgb(255 0 0)')).toBe('rgba(0, 0, 0, 0.15)')
    expect(getRingColorFromBackground('invalid', 0.62, 'hotpink')).toBe('hotpink')
  })
})
