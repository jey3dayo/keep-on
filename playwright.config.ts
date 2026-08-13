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
    // .env.keys が存在しない環境（CI等）では未設定として扱う
  }
}

/**
 * Playwright E2E テスト設定
 *
 * Cloudflare Access 経由の認証が前提のため、自動 E2E は認証不要な範囲のみを対象とする。
 * 認証が必要なフローは Access service token 方式を今後整備する。
 *
 * WSL2環境対応: localhost:3000へのアクセスが可能
 */

// デバッグ用: 鍵の読み込み状態のみを出力する（長さも鍵の情報なので出さない）
const privateKey = loadDotenvPrivateKey()
console.log('[playwright.config] DOTENV_PRIVATE_KEY loaded:', !!privateKey)

export default defineConfig({
  // 並列実行を無効化（認証セットアップの順序を保証）
  fullyParallel: false,

  // プロジェクト定義
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // レポート形式
  reporter: 'html',

  // CI環境でのみリトライを有効化
  retries: process.env.CI ? 2 : 0,
  // テストファイルの配置ディレクトリ
  testDir: './e2e',

  // 共通設定
  use: {
    // タイムアウト設定（WSL2環境を考慮して長めに設定）
    actionTimeout: 10_000,
    // ベースURL（WSL2環境でも動作）
    baseURL: 'http://localhost:3000',
    navigationTimeout: 10_000,

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // トレース収集（失敗時のみ）
    trace: 'on-first-retry',
  },

  // 開発サーバー自動起動設定
  webServer: {
    command: 'pnpm dev',
    // 秘密鍵はコマンド文字列へ補間しない。ps 出力やシェル履歴に残るため env で子プロセスへ渡す
    env: privateKey ? { DOTENV_PRIVATE_KEY: privateKey } : {},
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // WSL2環境を考慮して2分に設定
    // "/" は /dashboard へリダイレクトし、Access 未認証だと 302 終端になるため、
    // Playwright の webServer 判定が失敗する。認証不要で 200 を返す /health を使用する。
    url: 'http://localhost:3000/health',
  },

  // 並列ワーカー数（CI環境では1、ローカルでは自動）
  workers: process.env.CI ? 1 : undefined,
})
