import { expect, test } from '@playwright/test'

/**
 * ダッシュボード / 習慣ページのスモークテスト
 *
 * 認証済み状態（e2e/storage-state.json）で主要ページに到達できることのみを検証する。
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
