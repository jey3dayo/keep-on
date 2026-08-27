import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineIndicator } from './OfflineIndicator'

let mockIsOnline = false

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockIsOnline,
}))

describe('OfflineIndicator', () => {
  beforeEach(() => {
    mockIsOnline = false
  })

  it('status live regionをヘッダー下の暗色文字で表示する', async () => {
    render(<OfflineIndicator />)

    const indicator = await screen.findByRole('status')
    expect(indicator).toHaveAttribute('aria-live', 'polite')
    expect(indicator.className).toContain('top-[calc(var(--header-height)+env(safe-area-inset-top))]')
    expect(indicator.className).toContain('bg-yellow-500')
    expect(indicator.className).toContain('text-black')
  })
})
