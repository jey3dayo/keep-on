import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThemeProvider } from './ThemeProvider'

describe('ThemeProvider', () => {
  it('childrenをレンダリングする', () => {
    render(
      <ThemeProvider>
        <div>テストコンテンツ</div>
      </ThemeProvider>
    )

    expect(screen.getByText('テストコンテンツ')).toBeInTheDocument()
  })

  it('ThemeProviderでclass属性が設定される', () => {
    render(
      <ThemeProvider>
        <div>テスト</div>
      </ThemeProvider>
    )

    const html = document.documentElement
    expect(html.className).toBeTruthy()
  })
})
