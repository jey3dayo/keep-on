import '../src/app/globals.css'
import { withThemeByClassName, withThemeByDataAttribute } from '@storybook/addon-themes'
import type { Preview } from '@storybook/react'
import { Toaster } from '@/components/ui/sonner'
import { COLOR_THEMES, DEFAULT_COLOR_THEME } from '@/constants/theme'

const STORYBOOK_JEST_MATCHERS = Symbol.for('$$jest-matchers-object-storybook')
const existingStorybookMatchers = (globalThis as Record<symbol, unknown>)[STORYBOOK_JEST_MATCHERS]
if (
  !existingStorybookMatchers ||
  typeof existingStorybookMatchers !== 'object' ||
  !('customEqualityTesters' in existingStorybookMatchers)
) {
  const matchers = Object.create(null)
  const customEqualityTesters: unknown[] = []
  Object.defineProperty(globalThis, STORYBOOK_JEST_MATCHERS, {
    configurable: true,
    get: () => ({
      customEqualityTesters,
      matchers,
      state: {},
    }),
  })
}

const colorThemes = Object.fromEntries(COLOR_THEMES.map((theme) => [theme, theme]))
const classThemes = Object.fromEntries(COLOR_THEMES.map((theme) => [theme, '']))

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      defaultTheme: DEFAULT_COLOR_THEME,
      themes: {
        ...classThemes,
        dark: 'dark',
        light: '',
      },
    }),
    withThemeByDataAttribute({
      attributeName: 'data-theme',
      defaultTheme: DEFAULT_COLOR_THEME,
      themes: {
        ...colorThemes,
        dark: 'dark',
        light: '',
      },
    }),
    (Story) => (
      <>
        <Story />
        <Toaster position="bottom-right" richColors />
      </>
    ),
  ],
  parameters: {
    backgrounds: {
      disable: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
}

export default preview
