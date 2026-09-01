import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SW_NAV_STALE_MAX_AGE_MS } from '@/constants/pwa'

function parseMultiplicationExpression(expression: string): number {
  const factors = expression.split('*').map((factor) => factor.trim())
  if (factors.length === 0 || factors.some((factor) => !/^\d+$/.test(factor))) {
    throw new Error(`Unsupported numeric expression: ${expression}`)
  }
  return factors.reduce((product, factor) => product * Number(factor), 1)
}

describe('Service Worker の定数', () => {
  it('ナビゲーション stale 上限が src/constants/pwa.ts と同期している', () => {
    const swSource = readFileSync(join(import.meta.dirname, '../../../../public/sw.js'), 'utf-8')
    const match = swSource.match(/const NAV_STALE_MAX_AGE_MS\s*=\s*([\d\s*]+)/)

    expect(match).not.toBeNull()
    if (match === null) {
      return
    }

    expect(parseMultiplicationExpression(match[1])).toBe(SW_NAV_STALE_MAX_AGE_MS)
  })
})
