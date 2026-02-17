import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test as setup } from '@playwright/test'

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

// ファイルパス解決（ESM対応）
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const STORAGE_STATE = join(__dirname, 'storage-state.json')

// テストユーザー情報（testing.mdクイックリファレンスより）
const TEST_EMAIL = 'jane+clerk_test@example.com'
const TEST_PASSWORD = 'dyc.PBR3pjc.cmh!fmx'
const TEST_OTP = '424242'

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
  await page.click('button[type="submit"]')
  console.log('[auth.setup] Clicked Continue button')

  // パスワード入力画面を待機
  const passwordInput = page.locator('input[name="password"]')
  await passwordInput.waitFor({ state: 'visible', timeout: 10_000 })
  await passwordInput.fill(TEST_PASSWORD)
  console.log('[auth.setup] Password entered')

  // Continue ボタンをクリック
  await page.click('button[type="submit"]')
  console.log('[auth.setup] Clicked Continue button')

  // OTP入力画面またはダッシュボードへの遷移を待機
  try {
    // OTP入力画面が表示される場合（2FA有効時）
    const otpInput = page.locator('input[name="code"]')
    await otpInput.waitFor({ state: 'visible', timeout: 5000 })
    console.log('[auth.setup] OTP input detected, entering code...')

    await otpInput.fill(TEST_OTP)
    console.log('[auth.setup] OTP entered:', TEST_OTP)

    // Continue ボタンをクリック
    await page.click('button[type="submit"]')
    console.log('[auth.setup] Clicked Continue button')
  } catch (error) {
    // OTP入力画面が表示されない場合はスキップ
    console.log('[auth.setup] OTP input not required, skipping...')
  }

  // ダッシュボードへのリダイレクトを待機
  await page.waitForURL('/dashboard', { timeout: 10_000 })
  console.log('[auth.setup] Successfully redirected to /dashboard')

  // ページが完全にロードされるのを待機
  await page.waitForLoadState('networkidle')

  // 認証状態をファイルに保存
  await page.context().storageState({ path: STORAGE_STATE })
  console.log('[auth.setup] Authentication state saved to:', STORAGE_STATE)

  // 検証: Cookieが正しく保存されているか確認
  const cookies = await page.context().cookies()
  const clerkSessionCookie = cookies.find((cookie) => cookie.name.startsWith('__session'))
  expect(clerkSessionCookie).toBeDefined()
  console.log('[auth.setup] Clerk session cookie found:', clerkSessionCookie?.name)

  console.log('[auth.setup] Authentication setup completed successfully!')
})
