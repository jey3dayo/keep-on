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

import { existsSync } from 'node:fs'
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

// 認証状態のオリジン（e2e/auth.setup.tsで生成された認証状態のオリジン）
const AUTH_STATE_ORIGIN = 'http://localhost:3000'

// リモートデバッグポート
const REMOTE_DEBUGGING_PORT = 9222

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
  try {
    const targetOrigin = new URL(targetUrl).origin
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

  // Step 2: Chrome起動（リモートデバッグ有効）
  console.log('🔍 Step 2: Chromeを起動中...')
  const browser = await chromium.launch({
    headless: false,
    // セキュリティのため127.0.0.1にバインド（WSL2の場合は0.0.0.0が必要な場合がある）
    args: [`--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`, '--remote-debugging-address=127.0.0.1'],
  })
  console.log('✅ Chrome launched with remote debugging')
  console.log(`   📡 Remote debugging port: ${REMOTE_DEBUGGING_PORT}`)
  console.log('')

  // Step 3: 認証状態を読み込んでコンテキスト作成
  console.log('🔍 Step 3: 認証状態を読み込み中...')
  const context = await browser.newContext({
    storageState: STORAGE_STATE,
  })
  console.log('✅ Authentication state loaded')
  console.log('')

  // Step 4: 指定URLへ遷移
  console.log('🔍 Step 4: ページを開いています...')
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
    await browser.close()
    console.log('✅ Chrome closed')
    process.exit(0)
  })

  // ブラウザが閉じられるまで待機
  await page.waitForEvent('close', { timeout: 0 })
  await browser.close()
  console.log('')
  console.log('✅ Chrome closed')
  console.log('👋 終了します')
}

main().catch((error) => {
  console.error('❌ エラーが発生しました:', error)
  process.exit(1)
})
