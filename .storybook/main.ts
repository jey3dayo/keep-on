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
    const srcRoot = path.resolve(__dirname, '../src')
    const serverActionsMock = path.resolve(__dirname, './mocks/server-actions.ts')
    const dbMock = path.resolve(__dirname, './mocks/db.ts')
    const postgresMock = path.resolve(__dirname, './mocks/postgres.ts')
    const serverActionAliases = [
      {
        find: /^@\/app\/actions\/habits\/(archive|unarchive|delete|update|create|checkin|reset)$/,
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
      { find: /^@\//, replacement: `${srcRoot}/` },
      ...serverActionAliases,
      { find: /^@\/lib\/db$/, replacement: dbMock },
      { find: /^postgres$/, replacement: postgresMock },
      { find: '@clerk/nextjs/server', replacement },
      { find: '@clerk/nextjs/errors', replacement },
      { find: '@clerk/nextjs', replacement },
      ...existingAliases,
    ]
    config.esbuild = {
      ...(config.esbuild ?? {}),
      target: 'esnext',
    }
    config.define = {
      ...(config.define ?? {}),
      'process.env.SKIP_ENV_VALIDATION': '"1"',
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
