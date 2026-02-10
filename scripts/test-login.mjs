#!/usr/bin/env node

/**
 * Clerk テストユーザーログイン検証スクリプト
 * Chrome DevTools Protocol 経由でログインフローをテスト
 */

import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

// テスト認証情報
const TEST_EMAIL = 'jane+clerk_test@example.com'
const TEST_PASSWORD = 'dyc.PBR3pjc.cmh!fmx'
const TEST_OTP = '424242'

// スクリーンショット保存先
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
const screenshotDir = join(homedir(), 'user_home', 'Downloads', 'debug', timestamp)

async function testLogin() {
  console.log('🚀 Clerk ログインテストを開始します...')
  console.log(`📧 テストユーザー: ${TEST_EMAIL}`)
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

    // Step 1: サインインページへ遷移
    console.log('📍 Step 1: サインインページへ遷移')
    await page.goto('http://localhost:3000/sign-in', { waitUntil: 'domcontentloaded', timeout: 10_000 })
    await page.waitForTimeout(2000) // レンダリング待機
    await page.screenshot({ path: join(screenshotDir, '01-signin-page.png'), fullPage: true })
    console.log('   ✓ サインインページを表示')
    console.log('')

    // Step 2: メールアドレスを入力
    console.log('📍 Step 2: メールアドレス入力')
    const emailInput = page.locator('input[name="identifier"]').first()
    await emailInput.waitFor({ state: 'visible', timeout: 5000 })
    await emailInput.fill(TEST_EMAIL)
    await page.screenshot({ path: join(screenshotDir, '02-email-filled.png'), fullPage: true })
    console.log(`   ✓ メールアドレスを入力: ${TEST_EMAIL}`)
    console.log('')

    // Step 3: Continue ボタンをクリック
    console.log('📍 Step 3: Continue ボタンをクリック')
    const continueButton = page.locator('button[type="submit"]').first()
    await continueButton.click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: join(screenshotDir, '03-after-email-submit.png'), fullPage: true })
    console.log('   ✓ Continue をクリック')
    console.log('')

    // Step 4: パスワードまたは OTP 入力を判定
    console.log('📍 Step 4: 認証方法の判定')
    await page.waitForTimeout(2000)

    const passwordInput = page.locator('input[name="password"]')
    const codeInput = page.locator('input[name="code"]')

    const hasPassword = (await passwordInput.count()) > 0
    const hasCode = (await codeInput.count()) > 0

    if (hasPassword) {
      console.log('   → パスワード認証を検出')
      await passwordInput.fill(TEST_PASSWORD)
      await page.screenshot({ path: join(screenshotDir, '04-password-filled.png'), fullPage: true })
      console.log('   ✓ パスワードを入力')

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: join(screenshotDir, '05-after-password-submit.png'), fullPage: true })
      console.log('   ✓ パスワードを送信')
    }

    if (hasCode) {
      console.log('   → OTP 認証を検出')
      await codeInput.fill(TEST_OTP)
      await page.screenshot({ path: join(screenshotDir, '06-otp-filled.png'), fullPage: true })
      console.log(`   ✓ OTP を入力: ${TEST_OTP}`)

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: join(screenshotDir, '07-after-otp-submit.png'), fullPage: true })
      console.log('   ✓ OTP を送信')
    }

    // パスワード後に OTP が必要な場合
    if (hasPassword && !hasCode) {
      console.log('   → パスワード後の OTP 確認')
      await page.waitForTimeout(2000)
      const codeInputAfter = page.locator('input[name="code"]')
      if ((await codeInputAfter.count()) > 0) {
        console.log('   → OTP 入力画面に遷移')
        await codeInputAfter.fill(TEST_OTP)
        await page.screenshot({ path: join(screenshotDir, '08-otp-after-password.png'), fullPage: true })
        console.log(`   ✓ OTP を入力: ${TEST_OTP}`)

        const submitButton = page.locator('button[type="submit"]').first()
        await submitButton.click()
        await page.waitForTimeout(1000)
        await page.screenshot({ path: join(screenshotDir, '09-after-otp-submit.png'), fullPage: true })
        console.log('   ✓ OTP を送信')
      }
    }

    console.log('')

    // Step 5: ダッシュボードへのリダイレクトを確認
    console.log('📍 Step 5: ダッシュボードへのリダイレクト確認')
    await page.waitForTimeout(3000)

    const currentUrl = page.url()
    console.log(`   現在の URL: ${currentUrl}`)

    await page.screenshot({ path: join(screenshotDir, '10-final-page.png'), fullPage: true })

    if (currentUrl.includes('/dashboard')) {
      console.log('   ✅ ダッシュボードへのリダイレクト成功')

      // ダッシュボードの内容を確認
      const heading = await page.locator('h1').first().textContent()
      console.log(`   📝 見出し: ${heading}`)
    } else if (currentUrl.includes('/sign-in')) {
      console.log('   ⚠️  サインインページに留まっています')
      console.log('   エラーメッセージを確認...')

      const errorMessage = page.locator('[role="alert"]')
      if ((await errorMessage.count()) > 0) {
        const errorText = await errorMessage.textContent()
        console.log(`   ❌ エラー: ${errorText}`)
      }
    } else {
      console.log(`   ⚠️  予期しないページに遷移: ${currentUrl}`)
    }

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

testLogin()
