import '../src/app/globals.css'
import { withThemeByDataAttribute } from '@storybook/addon-themes'
import type { Preview } from '@storybook/react'
import { Toaster } from '@/components/ui/sonner'
import { COLOR_THEMES, DEFAULT_COLOR_THEME } from '@/constants/theme'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    backgrounds: {
      disable: true,
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: {
        ...Object.fromEntries(COLOR_THEMES.map((theme) => [theme, theme])),
        light: '',
        dark: 'dark',
      },
      defaultTheme: DEFAULT_COLOR_THEME,
      attributeName: 'data-theme',
    }),
    (Story) => (
      <>
        <Story />
        <Toaster position="bottom-right" richColors />
      </>
    ),
  ],
}

export default preview
