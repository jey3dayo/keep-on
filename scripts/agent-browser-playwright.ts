#!/usr/bin/env tsx

/**
 * agent-browser用Playwright Chrome起動スクリプト
 *
 * リモートデバッグポートを有効にしたChromeを起動し、指定URLを開きます。
 * 認証（Cloudflare Access）は実ブラウザの既存セッション前提とし、
 * このスクリプト自体では認証状態の読み込み・生成は行わない。
 *
 * 使い方:
 *   pnpm exec tsx scripts/agent-browser-playwright.ts [URL]
 *
 * 例:
 *   pnpm exec tsx scripts/agent-browser-playwright.ts
 *   pnpm exec tsx scripts/agent-browser-playwright.ts http://localhost:3000/dashboard
 *   pnpm exec tsx scripts/agent-browser-playwright.ts https://keep-on.jey3dayo.net
 */

import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

// ファイルパス解決（ESM対応）
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

// デフォルトURL
const DEFAULT_URL = 'http://localhost:3000/dashboard'

// コマンドライン引数からURLを取得
const targetUrl = process.argv[2] || DEFAULT_URL

const LOCAL_ORIGIN = 'http://localhost:3000'
const LOCAL_HEALTHCHECK_URL = 'http://localhost:3000/health'
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
    // .env.keys が存在しない環境では未設定として扱う
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
  if (targetOrigin !== LOCAL_ORIGIN) {
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

  // オリジン検証
  let targetOrigin: string
  try {
    targetOrigin = new URL(targetUrl).origin
  } catch {
    console.error('❌ URLの解析に失敗しました:', targetUrl)
    console.error('')
    process.exit(1)
  }

  // Step 1: ローカル開発サーバー起動確認（必要なら自動起動）
  console.log('🔍 Step 1: 開発サーバーを確認中...')
  const localServer = await ensureLocalDevServer(targetOrigin)
  stopLocalServer = localServer.stop
  startedLocalServerByScript = localServer.startedByScript

  // Step 2: Chrome起動（リモートデバッグ有効）
  console.log('🔍 Step 2: Chromeを起動中...')
  const browser = await chromium.launch({
    // セキュリティのため127.0.0.1にバインド（WSL2の場合は0.0.0.0が必要な場合がある）
    args: [`--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`, '--remote-debugging-address=127.0.0.1'],
    headless: false,
  })
  console.log('✅ Chrome launched with remote debugging')
  console.log(`   📡 Remote debugging port: ${REMOTE_DEBUGGING_PORT}`)
  console.log('')

  // Step 3: 指定URLへ遷移
  // Cloudflare Access 認証は、Chrome の既存プロファイン／実ブラウザセッション前提。
  // このスクリプトでは認証状態の注入は行わない。
  console.log('🔍 Step 3: ページを開いています...')
  const context = await browser.newContext()
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
  console.log('   • Cloudflare Access の認証が必要な場合は、開いたブラウザ上で手動ログインしてください')
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
