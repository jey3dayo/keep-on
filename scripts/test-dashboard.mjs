#!/usr/bin/env node
/**
 * ダッシュボード動作確認スクリプト
 * ログイン済みの状態でダッシュボードの機能をテスト
 */

import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

// スクリーンショット保存先
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
const screenshotDir = join(homedir(), 'user_home', 'Downloads', 'debug', timestamp)

async function testDashboard() {
  console.log('🚀 ダッシュボード機能テストを開始します...')
  console.log(`📁 スクリーンショット: ${screenshotDir}`)
  console.log('')

  // スクリーンショットディレクトリを作成
  await mkdir(screenshotDir, { recursive: true })

  let browser
  try {
    // Chrome に接続（Windows ホスト経由）
    const winHostIp = '172.24.160.1'
    console.log(`🔌 Chrome に接続中（${winHostIp}:9222）...`)
    browser = await chromium.connectOverCDP(`http://${winHostIp}:9222`)

    const contexts = browser.contexts()
    if (contexts.length === 0) {
      throw new Error('アクティブなブラウザコンテキストが見つかりません')
    }

    const context = contexts[0]
    const pages = context.pages()
    const page = pages.length > 0 ? pages[0] : await context.newPage()

    console.log('✅ Chrome に接続しました')
    console.log('')

    // Step 1: ダッシュボードへ遷移
    console.log('📍 Step 1: ダッシュボードへ遷移')
    await page.goto('http://localhost:3000/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 10_000,
    })
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: join(screenshotDir, '01-dashboard.png'),
      fullPage: true,
    })
    console.log('   ✓ ダッシュボードを表示')
    console.log('')

    // Step 2: ページタイトルを確認
    console.log('📍 Step 2: ページタイトル確認')
    const title = await page.title()
    console.log(`   📝 タイトル: ${title}`)

    // Step 3: 習慣リストを確認
    console.log('')
    console.log('📍 Step 3: 習慣リスト確認')
    const habits = await page.locator('[data-testid="habit-item"]').count()
    console.log(`   📊 習慣数: ${habits}`)

    // 習慣が表示されている場合
    if (habits > 0) {
      console.log('   ✅ 習慣が表示されています')

      // 最初の習慣の情報を取得
      const firstHabit = page.locator('[data-testid="habit-item"]').first()
      const habitName = await firstHabit
        .locator('text=/水を飲む|運動する|読書する/')
        .first()
        .textContent()
        .catch(() => 'N/A')
      console.log(`   📝 最初の習慣: ${habitName}`)
    } else {
      console.log('   ⚠️  習慣がまだ作成されていません')
    }

    // Step 4: 習慣ページへ遷移
    console.log('')
    console.log('📍 Step 4: 習慣ページへ遷移')
    await page.goto('http://localhost:3000/habits', {
      waitUntil: 'domcontentloaded',
      timeout: 10_000,
    })
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: join(screenshotDir, '02-habits-page.png'),
      fullPage: true,
    })
    console.log('   ✓ 習慣ページを表示')

    const habitsPageTitle = await page.title()
    console.log(`   📝 タイトル: ${habitsPageTitle}`)

    // Step 5: 現在の URL を確認
    console.log('')
    console.log('📍 Step 5: 最終確認')
    const currentUrl = page.url()
    console.log(`   🌐 現在の URL: ${currentUrl}`)

    await page.screenshot({
      path: join(screenshotDir, '03-final-state.png'),
      fullPage: true,
    })

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ テスト完了')
    console.log(`📁 スクリーンショット: ${screenshotDir}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  } catch (error) {
    console.error('')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ テスト失敗')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(error)
    console.error('')
    console.error(`📁 スクリーンショット: ${screenshotDir}`)
    process.exit(1)
  } finally {
    // ブラウザは閉じない（デバッグ用に開いたまま）
    console.log('')
    console.log('💡 Chrome は開いたままにしています')
  }
}

testDashboard()
