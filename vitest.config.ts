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
      // `git wt` が作る .worktrees/ と、Claude Code の EnterWorktree が作る .claude/worktrees/。
      // 除外しないと worktree 内の e2e spec を Vitest が拾い、テスト全体が exit 1 になる
      '**/.worktrees/**',
      '**/.claude/worktrees/**',
      '**/*.stories.tsx',
      '**/*.stories.ts',
      // e2e は Playwright が実行する。Playwright の testMatch が *.spec.* を要求するため
      // ファイル名では住み分けられず、ここで除外する必要がある
      'e2e/**',
    ],
    globals: true,
    include: ['**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', '**/*.spec.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
