#!/usr/bin/env tsx

/**
 * agent-browser用Playwright Chrome起動スクリプト
 *
 * 認証状態（e2e/storage-state.json）を読み込んで、
 * リモートデバッグポートを有効にしたChromeを起動します。
 *
 * 使い方:
 *   pnpm exec tsx scripts/agent-browser-playwright.ts [URL]
 *
 * 例:
 *   pnpm exec tsx scripts/agent-browser-playwright.ts
 *   pnpm exec tsx scripts/agent-browser-playwright.ts http://localhost:3000/dashboard
 *   pnpm exec tsx scripts/agent-browser-playwright.ts https://keep-on.j138cm.workers.dev
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

// ファイルパス解決（ESM対応）
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')
const STORAGE_STATE = join(PROJECT_ROOT, 'e2e/storage-state.json')

// デフォルトURL
const DEFAULT_URL = 'http://localhost:3000/dashboard'

// コマンドライン引数からURLを取得
const targetUrl = process.argv[2] || DEFAULT_URL

// 認証状態のオリジン（e2e/auth.setup.cjsで生成された認証状態のオリジン）
const AUTH_STATE_ORIGIN = 'http://localhost:3000'
const LOCAL_HEALTHCHECK_URL = 'http://localhost:3000/sign-in'
const SERVER_START_TIMEOUT_MS = 120_000
const SERVER_POLL_INTERVAL_MS = 1000

// リモートデバッグポート
const REMOTE_DEBUGGING_PORT = 9222
const noop = () => undefined
let stopLocalServer: () => void = noop
let startedLocalServerByScript = false

function loadDotenvPrivateKey(): string | undefined {
  try {
    const envKeysPath = join(PROJECT_ROOT, '.env.keys')
    const envKeysContent = readFileSync(envKeysPath, 'utf-8')
    const match = envKeysContent.match(/^DOTENV_PRIVATE_KEY=(.+)$/m)
    return match ? match[1] : undefined
  } catch {
    return undefined
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function isUrlAvailable(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    })
    return response.status >= 200 && response.status < 400
  } catch {
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

async function ensureLocalDevServer(targetOrigin: string): Promise<{
  startedByScript: boolean
  stop: () => void
}> {
  if (targetOrigin !== AUTH_STATE_ORIGIN) {
    return { startedByScript: false, stop: noop }
  }

  if (await isUrlAvailable(LOCAL_HEALTHCHECK_URL)) {
    console.log('✅ Development server is running')
    console.log('')
    return { startedByScript: false, stop: noop }
  }

  console.log('⚠️  開発サーバーが起動していないため自動起動します')

  const privateKey = loadDotenvPrivateKey()
  const child = spawn('pnpm', ['dev'], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      ...(privateKey ? { DOTENV_PRIVATE_KEY: privateKey } : {}),
    },
    stdio: 'pipe',
  })

  let stderrTail = ''
  if (child.stderr) {
    child.stderr.setEncoding('utf-8')
    child.stderr.on('data', (chunk: string) => {
      const next = `${stderrTail}${chunk}`
      stderrTail = next.slice(-4000)
    })
  }

  const startDeadline = Date.now() + SERVER_START_TIMEOUT_MS
  while (Date.now() < startDeadline) {
    if (child.exitCode !== null) {
      const exitCode = child.exitCode
      const errorDetails = stderrTail.trim()
      throw new Error(
        `開発サーバー起動に失敗しました (exit code: ${exitCode})${errorDetails ? `\n${errorDetails}` : ''}`
      )
    }

    if (await isUrlAvailable(LOCAL_HEALTHCHECK_URL)) {
      console.log('✅ Development server started')
      console.log('')
      return {
        startedByScript: true,
        stop: () => {
          if (child.exitCode === null && !child.killed) {
            child.kill('SIGTERM')
          }
        },
      }
    }

    await wait(SERVER_POLL_INTERVAL_MS)
  }

  if (child.exitCode === null && !child.killed) {
    child.kill('SIGTERM')
  }

  throw new Error(`開発サーバー起動がタイムアウトしました (${SERVER_START_TIMEOUT_MS}ms)`)
}

async function main() {
  console.log('🚀 agent-browser用Playwright Chrome起動スクリプト')
  console.log('================================================')
  console.log('')

  // Step 1: 認証状態ファイル存在確認
  console.log('🔍 Step 1: 認証状態ファイルを確認中...')
  if (!existsSync(STORAGE_STATE)) {
    console.error('❌ エラー: e2e/storage-state.json が見つかりません')
    console.error('')
    console.error('以下のコマンドで認証状態を生成してください:')
    console.error('  ./scripts/setup-auth-state.sh')
    console.error('')
    process.exit(1)
  }
  console.log('✅ storage-state.json found')
  console.log('')

  // オリジン検証
  let targetOrigin: string
  try {
    targetOrigin = new URL(targetUrl).origin
    if (targetOrigin !== AUTH_STATE_ORIGIN) {
      console.log('⚠️  警告: 認証状態と異なるオリジンを指定しています')
      console.log(`   認証状態オリジン: ${AUTH_STATE_ORIGIN}`)
      console.log(`   指定されたオリジン: ${targetOrigin}`)
      console.log('')
      console.log('   異なるオリジンではクッキーが共有されないため、ログアウト状態になります。')
      console.log('   本番環境など異なるオリジンをテストする場合は、そのオリジン用の認証状態を別途生成してください。')
      console.log('')
    }
  } catch (_error) {
    console.error('❌ URLの解析に失敗しました:', targetUrl)
    console.error('')
    process.exit(1)
  }

  // Step 2: ローカル開発サーバー起動確認（必要なら自動起動）
  console.log('🔍 Step 2: 開発サーバーを確認中...')
  const localServer = await ensureLocalDevServer(targetOrigin)
  stopLocalServer = localServer.stop
  startedLocalServerByScript = localServer.startedByScript

  // Step 3: Chrome起動（リモートデバッグ有効）
  console.log('🔍 Step 3: Chromeを起動中...')
  const browser = await chromium.launch({
    headless: false,
    // セキュリティのため127.0.0.1にバインド（WSL2の場合は0.0.0.0が必要な場合がある）
    args: [`--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`, '--remote-debugging-address=127.0.0.1'],
  })
  console.log('✅ Chrome launched with remote debugging')
  console.log(`   📡 Remote debugging port: ${REMOTE_DEBUGGING_PORT}`)
  console.log('')

  // Step 4: 認証状態を読み込んでコンテキスト作成
  console.log('🔍 Step 4: 認証状態を読み込み中...')
  const context = await browser.newContext({
    storageState: STORAGE_STATE,
  })
  console.log('✅ Authentication state loaded')
  console.log('')

  // Step 5: 指定URLへ遷移
  console.log('🔍 Step 5: ページを開いています...')
  const page = await context.newPage()
  await page.goto(targetUrl)
  console.log('✅ Page opened:', targetUrl)
  console.log('')

  // 使用方法を表示
  console.log('================================================')
  console.log('🎉 準備完了！')
  console.log('')
  console.log('agent-browserでデバッグする準備が整いました。')
  console.log('')
  console.log('📌 リモートデバッグ情報:')
  console.log(`   • ポート: ${REMOTE_DEBUGGING_PORT}`)
  console.log(`   • URL: http://localhost:${REMOTE_DEBUGGING_PORT}/json/version`)
  console.log('')
  console.log('📌 開いたページ:')
  console.log(`   • ${targetUrl}`)
  console.log('')
  console.log('💡 agent-browserでの使用方法:')
  console.log('   • MCP Chrome DevToolsは自動的にこのChromeインスタンスに接続します')
  console.log('   • すでにログイン済みの状態でページが開いています')
  console.log('   • スクリーンショットやDOM操作が可能です')
  console.log('')
  console.log('⚠️  終了方法:')
  console.log('   • Ctrl+C でこのスクリプトを終了するとChromeも閉じます')
  console.log('   • Chromeウィンドウを直接閉じることもできます')
  console.log('')
  console.log('⏳ Chromeウィンドウが閉じられるまで待機中...')
  console.log('   （Ctrl+C で強制終了、またはChromeウィンドウを閉じてください）')

  // Ctrl+Cハンドラー
  process.on('SIGINT', async () => {
    console.log('')
    console.log('🛑 終了シグナルを受信しました。Chromeを閉じています...')
    stopLocalServer()
    await browser.close()
    console.log('✅ Chrome closed')
    process.exit(0)
  })

  // ブラウザが閉じられるまで待機
  // browser.on('disconnected')を使用してブラウザ全体の終了を確実に検出
  await new Promise<void>((resolve) => {
    browser.on('disconnected', () => {
      resolve()
    })
  })

  console.log('')
  console.log('✅ Chrome closed')
  stopLocalServer()
  if (startedLocalServerByScript) {
    console.log('✅ Development server stopped')
  }
  console.log('👋 終了します')
}

main().catch((error) => {
  stopLocalServer()
  if (startedLocalServerByScript) {
    console.log('✅ Development server stopped')
  }
  console.error('❌ エラーが発生しました:', error)
  process.exit(1)
})
