'use strict'

const { join } = require('node:path')
const { expect, test: setup } = require('@playwright/test')

/**
 * Clerk認証状態生成セットアップ
 *
 * testing.mdのクイックリファレンスからテストユーザー情報を取得し、
 * Clerkログインフローを実行して認証状態をe2e/storage-state.jsonに保存します。
 *
 * テストユーザー情報:
 * - メールアドレス: jane+clerk_test@example.com
 * - パスワード: dyc.PBR3pjc.cmh!fmx
 * - OTP: 424242
 */

// ファイルパス解決（CJS）
const STORAGE_STATE = join(__dirname, 'storage-state.json')

// テストユーザー情報（testing.mdクイックリファレンスより）
const TEST_EMAIL = 'jane+clerk_test@example.com'
const TEST_PASSWORD = 'dyc.PBR3pjc.cmh!fmx'
const TEST_OTP = '424242'

async function clickContinue(page) {
  await page
    .getByRole('button', { name: /^Continue$/ })
    .first()
    .click()
}

setup('authenticate with Clerk', async ({ page }) => {
  console.log('[auth.setup] Starting Clerk authentication...')

  // サインインページへ遷移
  await page.goto('/sign-in')
  console.log('[auth.setup] Navigated to /sign-in')

  // メールアドレス入力
  const emailInput = page.locator('input[name="identifier"]')
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 })
  await emailInput.fill(TEST_EMAIL)
  console.log('[auth.setup] Email entered:', TEST_EMAIL)

  // Continue ボタンをクリック
  await clickContinue(page)
  console.log('[auth.setup] Clicked Continue button')

  // パスワード入力画面を待機
  const passwordInput = page.locator('input[name="password"]')
  await passwordInput.waitFor({ state: 'visible', timeout: 10_000 })
  await passwordInput.fill(TEST_PASSWORD)
  console.log('[auth.setup] Password entered')

  // Continue ボタンをクリック
  await clickContinue(page)
  console.log('[auth.setup] Clicked Continue button')

  // OTP入力画面またはダッシュボードへの遷移を待機
  try {
    // 2FA/メール認証コード入力画面が表示される場合
    const otpInput = page
      .locator('input[name="code"], input[autocomplete="one-time-code"], input[placeholder*="verification code" i]')
      .first()
    await otpInput.waitFor({ state: 'visible', timeout: 10_000 })
    console.log('[auth.setup] Verification code input detected, entering code...')

    await otpInput.fill(TEST_OTP)
    console.log('[auth.setup] Verification code entered:', TEST_OTP)

    // Continue ボタンをクリック
    await clickContinue(page)
    console.log('[auth.setup] Clicked Continue button')
  } catch {
    // OTP入力画面が表示されない場合はスキップ
    console.log('[auth.setup] OTP input not required, skipping...')
  }

  // URL遷移ではなく、ClerkセッションCookieの確立を認証完了条件にする
  await expect
    .poll(
      async () => {
        const cookies = await page.context().cookies()
        return cookies.some((cookie) => cookie.name.startsWith('__session'))
      },
      { timeout: 20_000 }
    )
    .toBeTruthy()
  console.log('[auth.setup] Clerk session cookie detected')

  // 少なくともDOMが読み込み済みであることを確認
  await page.waitForLoadState('domcontentloaded')

  // 認証状態をファイルに保存
  await page.context().storageState({ path: STORAGE_STATE })
  console.log('[auth.setup] Authentication state saved to:', STORAGE_STATE)

  // 検証: Cookieが正しく保存されているか確認（補助的なチェック）
  const cookies = await page.context().cookies()
  const clerkSessionCookie = cookies.find((cookie) => cookie.name.startsWith('__session'))
  if (clerkSessionCookie) {
    console.log('[auth.setup] Clerk session cookie found:', clerkSessionCookie.name)
  } else {
    console.log('[auth.setup] Warning: __session cookie not found after authentication flow')
  }

  console.log('[auth.setup] Authentication setup completed successfully!')
})
