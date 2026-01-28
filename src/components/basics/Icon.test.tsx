import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon, isValidIconName, normalizeIconName } from './Icon'

describe('Icon', () => {
  describe('レンダリング', () => {
    it('有効なアイコン名でSVGがレンダリングされる', () => {
      render(<Icon name="check" size={24} />)
      const svg = document.querySelector('svg')
      expect(svg?.tagName.toLowerCase()).toBe('svg')
    })

    it('sizeプロパティが適用される', () => {
      render(<Icon name="check" size={32} />)
      const svg = document.querySelector('svg')
      expect(svg).toHaveAttribute('width', '32')
      expect(svg).toHaveAttribute('height', '32')
    })

    it('strokeWidthプロパティが適用される', () => {
      render(<Icon name="check" size={24} strokeWidth={3} />)
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('colorプロパティでclassNameが追加される', () => {
      render(<Icon color="red" name="check" size={24} />)
      const svg = document.querySelector('svg')
      expect(svg?.className).toContain('text-red')
    })

    it('aria-hidden属性が設定できる', () => {
      render(<Icon aria-hidden="true" name="check" size={24} />)
      const svg = document.querySelector('svg[aria-hidden="true"]')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('isValidIconName', () => {
    it('有効なアイコン名でtrueを返す', () => {
      expect(isValidIconName('check')).toBe(true)
      expect(isValidIconName('sun')).toBe(true)
      expect(isValidIconName('moon')).toBe(true)
    })

    it('無効なアイコン名でfalseを返す', () => {
      expect(isValidIconName('invalid-icon')).toBe(false)
      expect(isValidIconName('')).toBe(false)
      expect(isValidIconName(null)).toBe(false)
      expect(isValidIconName(undefined)).toBe(false)
    })
  })

  describe('normalizeIconName', () => {
    it('有効なアイコン名をそのまま返す', () => {
      expect(normalizeIconName('check')).toBe('check')
      expect(normalizeIconName('sun')).toBe('sun')
    })

    it('無効なアイコン名をデフォルトにフォールバック', () => {
      expect(normalizeIconName('invalid')).toBe('circle-check')
      expect(normalizeIconName('')).toBe('circle-check')
    })

    it('レガシーアイコン名を新しい名前にマッピング', () => {
      expect(normalizeIconName('water')).toBe('droplets')
      expect(normalizeIconName('exercise')).toBe('dumbbell')
      expect(normalizeIconName('read')).toBe('book-open')
      expect(normalizeIconName('sleep')).toBe('moon')
    })

    it('全てのレガシーアイコンが正しくマッピングされる', () => {
      const legacyIcons = [
        'water',
        'exercise',
        'read',
        'sleep',
        'health',
        'nutrition',
        'meditate',
        'photo',
        'art',
        'walk',
        'medicine',
        'time',
        'sparkle',
        'goal',
        'streak',
      ]

      for (const legacy of legacyIcons) {
        const normalized = normalizeIconName(legacy)
        expect(isValidIconName(normalized)).toBe(true)
      }
    })
  })
})
