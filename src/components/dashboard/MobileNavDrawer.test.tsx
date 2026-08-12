import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NAV_ITEMS } from '@/constants/navigation'
import { MobileNavDrawer } from './MobileNavDrawer'

const setOpenMobile = vi.fn()

vi.mock('@/components/sidebar/Sidebar', () => ({
  useSidebar: () => ({ openMobile: true, setOpenMobile }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('MobileNavDrawer', () => {
  it('NAV_ITEMS の主要項目と副次項目をすべて表示する', () => {
    render(<MobileNavDrawer />)

    for (const item of [...NAV_ITEMS.main, ...NAV_ITEMS.secondary]) {
      expect(screen.getByRole('link', { name: item.titleKey })).toHaveAttribute('href', item.url)
    }
  })

  it('項目をタップするとシートを閉じる', async () => {
    const user = userEvent.setup()
    render(<MobileNavDrawer />)

    await user.click(screen.getByRole('link', { name: NAV_ITEMS.main[0].titleKey }))

    expect(setOpenMobile).toHaveBeenCalledWith(false)
  })
})
