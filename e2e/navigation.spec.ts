import { expect, test } from '@playwright/test'

/**
 * 主要ページのスモークテスト（/analytics, /settings, /help, サイドバー遷移）
 *
 * 認証が必要なページへ到達できることのみを検証する。storage-state による認証セットアップは未整備。
 * ローカル E2E では DEV_ACCESS_EMAIL 等の開発用フォールバックに依存する場合がある。
 * Access service token 方式は今後整備予定（.claude/rules/testing.md 参照）。
 *
 * 本番と同じ D1 を共有する環境があるため、チェックインや習慣の作成・編集・削除などの
 * データを書き込む操作、および特定の習慣件数・内容に依存するアサーションは含めない。
 *
 * 習慣詳細ページ（/habits/[id]）は特定の習慣 ID に依存し、習慣が 0 件の環境では
 * 到達できないため、このファイルではカバーしない。
 */

test.describe('authenticated navigation to secondary pages', () => {
  test('reaches /analytics and shows the analytics heading', async ({ page }) => {
    await page.goto('/analytics')

    // ヘッダーにも同名の h1（ページタイトル表示）があるため、ページ本文側（DOM順で後）を対象にする
    await expect(page.getByRole('heading', { level: 1, name: 'アナリティクス' }).last()).toBeVisible()
  })

  test('reaches /settings and shows the settings heading', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('heading', { level: 1, name: '設定' }).last()).toBeVisible()
  })

  test('reaches /help and shows the help heading', async ({ page }) => {
    await page.goto('/help')

    await expect(page.getByRole('heading', { level: 1, name: 'ヘルプ' }).last()).toBeVisible()
  })
})

test.describe('sidebar navigation between pages', () => {
  test('navigates from dashboard to analytics, settings, and help via the sidebar', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('header').getByRole('heading', { level: 1, name: 'ダッシュボード' })).toBeVisible()

    // /analytics, /settings, /help はページ本文側にも <header> と同名 h1 があるため、
    // サイトヘッダー（DOM順で先頭）の h1 を .first() で明示する
    await page.getByRole('link', { name: 'アナリティクス' }).first().click()
    await expect(page).toHaveURL(/\/analytics$/)
    await expect(page.getByRole('heading', { level: 1, name: 'アナリティクス' }).first()).toBeVisible()

    await page.getByRole('link', { name: '設定' }).first().click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('heading', { level: 1, name: '設定' }).first()).toBeVisible()

    await page.getByRole('link', { name: 'ヘルプ' }).first().click()
    await expect(page).toHaveURL(/\/help$/)
    await expect(page.getByRole('heading', { level: 1, name: 'ヘルプ' }).first()).toBeVisible()
  })
})
