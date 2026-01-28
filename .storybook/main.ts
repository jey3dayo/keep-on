import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/nextjs-vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes', '@storybook/addon-a11y'],
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
  viteFinal: (config) => {
    config.resolve = config.resolve ?? {}
    const replacement = path.resolve(__dirname, './mocks/clerk.tsx')
    const serverActionsMock = path.resolve(__dirname, './mocks/server-actions.ts')
    const serverActionAliases = [
      {
        find: /^@\/app\/actions\/habits\/(archive|unarchive|delete|update|create|checkin)$/,
        replacement: serverActionsMock,
      },
      {
        find: /^@\/app\/actions\/settings\/updateWeekStart$/,
        replacement: serverActionsMock,
      },
    ]

    const existingAliases = Array.isArray(config.resolve.alias)
      ? config.resolve.alias
      : Object.entries(config.resolve.alias ?? {}).map(([find, replacement]) => ({ find, replacement }))

    config.resolve.alias = [
      ...serverActionAliases,
      { find: '@clerk/nextjs/server', replacement },
      { find: '@clerk/nextjs/errors', replacement },
      { find: '@clerk/nextjs', replacement },
      ...existingAliases,
    ]
    config.esbuild = {
      ...(config.esbuild ?? {}),
      target: 'esnext',
    }
    config.optimizeDeps = config.optimizeDeps ?? {}
    config.optimizeDeps.exclude = [...(config.optimizeDeps.exclude ?? []), '@clerk/nextjs']
    config.optimizeDeps.esbuildOptions = {
      ...(config.optimizeDeps.esbuildOptions ?? {}),
      target: 'esnext',
    }
    return config
  },
}

export default config
