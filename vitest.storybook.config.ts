import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/.worktrees/**',
      // These stories are covered by the Storybook-side suite below because they have no in-source test block.
      '**/HabitCalendarHeatmap.stories.tsx',
      '**/HabitListCard.stories.tsx',
    ],
    globals: true,
    include: ['**/*.stories.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', '.storybook/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    passWithNoTests: false,
    setupFiles: ['./vitest.setup.ts'],
  },
})
