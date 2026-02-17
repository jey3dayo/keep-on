import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

/**
 * .env.keysファイルからDOTENV_PRIVATE_KEYを読み込む
 * dotenvxは.env.keysファイルを自動的に読み込まないため、
 * 環境変数として明示的に渡す必要がある
 */
function loadDotenvPrivateKey(): string | undefined {
  try {
    const envKeysPath = join(process.cwd(), '.env.keys')
    const envKeysContent = readFileSync(envKeysPath, 'utf-8')
    const match = envKeysContent.match(/^DOTENV_PRIVATE_KEY=(.+)$/m)
    return match ? match[1] : undefined
  } catch {
    // .env.keysファイルが存在しない場合はundefinedを返す
    return undefined
  }
}

/**
 * Playwright E2E テスト設定
 *
 * このファイルは以下の2つのプロジェクトを定義します:
 * 1. setup: Clerk認証状態を生成し、e2e/storage-state.jsonに保存
 * 2. chromium: 保存された認証状態を読み込んでE2Eテストを実行
 *
 * WSL2環境対応: localhost:3000へのアクセスが可能
 */
export default defineConfig({
  // テストファイルの配置ディレクトリ
  testDir: './e2e',

  // 並列実行を無効化（認証セットアップの順序を保証）
  fullyParallel: false,

  // CI環境でのみリトライを有効化
  retries: process.env.CI ? 2 : 0,

  // 並列ワーカー数（CI環境では1、ローカルでは自動）
  workers: process.env.CI ? 1 : undefined,

  // レポート形式
  reporter: 'html',

  // 共通設定
  use: {
    // ベースURL（WSL2環境でも動作）
    baseURL: 'http://localhost:3000',

    // トレース収集（失敗時のみ）
    trace: 'on-first-retry',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // タイムアウト設定（WSL2環境を考慮して長めに設定）
    actionTimeout: 10_000,
    navigationTimeout: 10_000,
  },

  // プロジェクト定義
  projects: [
    // 認証状態生成プロジェクト
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      // setupプロジェクトはstorageStateを読み込まない
    },

    // E2Eテストプロジェクト（認証状態を再利用）
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // setupプロジェクトで生成された認証状態を読み込む
        storageState: 'e2e/storage-state.json',
      },
      // setupプロジェクトに依存
      dependencies: ['setup'],
    },
  ],

  // 開発サーバー自動起動設定
  webServer: {
    // Next.js開発サーバーを起動（pnpm devスクリプトが内部でdotenvxを実行）
    // 注: dotenvxは.env.keysを自動読み込みしないため、DOTENV_PRIVATE_KEYを環境変数として渡す
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // WSL2環境を考慮して2分に設定
    // .env.keysファイルからDOTENV_PRIVATE_KEYを読み込んで環境変数として設定
    env: {
      DOTENV_PRIVATE_KEY: loadDotenvPrivateKey() || '',
    },
  },
})
