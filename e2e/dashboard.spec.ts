import { expect, test } from '@playwright/test'

/**
 * ダッシュボード / 習慣ページのスモークテスト
 *
 * 認証が必要なページへ到達できることのみを検証する。storage-state による認証セットアップは未整備。
 * ローカル E2E では DEV_ACCESS_EMAIL 等の開発用フォールバックに依存する場合がある。
 * Access service token 方式は今後整備予定（.claude/rules/testing.md 参照）。
 *
 * 本番と同じ D1 を共有する環境があるため、チェックインなどデータを書き込む操作は含めない。
 */

test.describe('authenticated navigation', () => {
  test('reaches /dashboard and shows the dashboard title', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.locator('header').getByRole('heading', { level: 1, name: 'ダッシュボード' })).toBeVisible()
  })

  test('reaches /habits and shows the habits heading', async ({ page }) => {
    await page.goto('/habits')

    // ヘッダーにも同名の h1（ページタイトル表示）があるため、ページ本文側（DOM順で後）を対象にする
    await expect(page.getByRole('heading', { level: 1, name: '習慣' }).last()).toBeVisible()
    await expect(page.getByRole('link', { name: '新しい習慣' })).toBeVisible()
  })

  test('header title updates when navigating from dashboard to habits', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('header').getByRole('heading', { level: 1, name: 'ダッシュボード' })).toBeVisible()

    await page.getByRole('link', { name: '習慣' }).first().click()

    await expect(page).toHaveURL(/\/habits$/)
    await expect(page.locator('header').getByRole('heading', { level: 1, name: '習慣' }).first()).toBeVisible()
  })
})
