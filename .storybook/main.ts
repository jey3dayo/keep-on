import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/nextjs-vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  addons: ['@storybook/addon-docs', '@storybook/addon-themes', '@storybook/addon-a11y'],
  docs: {
    autodocs: 'tag',
  },
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  staticDirs: ['../public'],
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  typescript: {
    check: false,
  },
  viteFinal: (viteConfig) => {
    viteConfig.resolve = viteConfig.resolve ?? {}
    const clerkMock = path.resolve(__dirname, './mocks/clerk.tsx')
    const serverActionsMock = path.resolve(__dirname, './mocks/server-actions.ts')
    const dbMock = path.resolve(__dirname, './mocks/db.ts')
    const postgresMock = path.resolve(__dirname, './mocks/postgres.ts')
    const srcRoot = path.resolve(__dirname, '../src')
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

    const existingAliases = Array.isArray(viteConfig.resolve.alias)
      ? viteConfig.resolve.alias
      : Object.entries(viteConfig.resolve.alias ?? {}).map(([find, to]) => ({ find, replacement: to }))

    viteConfig.resolve.alias = [
      { find: /^@\//, replacement: `${srcRoot}/` },
      ...serverActionAliases,
      { find: /^@\/lib\/db$/, replacement: dbMock },
      { find: /^postgres$/, replacement: postgresMock },
      { find: '@clerk/nextjs/server', replacement: clerkMock },
      { find: '@clerk/nextjs/errors', replacement: clerkMock },
      { find: '@clerk/nextjs', replacement: clerkMock },
      ...existingAliases,
    ]
    viteConfig.define = {
      ...(viteConfig.define ?? {}),
      'process.env.SKIP_ENV_VALIDATION': '"1"',
    }
    viteConfig.esbuild = {
      ...(viteConfig.esbuild ?? {}),
      target: 'esnext',
    }
    viteConfig.optimizeDeps = viteConfig.optimizeDeps ?? {}
    viteConfig.optimizeDeps.exclude = [...(viteConfig.optimizeDeps.exclude ?? []), '@clerk/nextjs']
    viteConfig.optimizeDeps.esbuildOptions = {
      ...(viteConfig.optimizeDeps.esbuildOptions ?? {}),
      target: 'esnext',
    }
    return viteConfig
  },
}

export default config
