import type { StorybookConfig } from '@storybook/nextjs-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    check: false,
  },
  experimental: {
    vitest: {
      configFile: './vitest.config.ts',
    },
  },
}

export default config
