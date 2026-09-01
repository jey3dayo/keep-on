'use client'

import { ACCESS_LOGOUT_URL } from '@/constants/auth'
import { clearUserCachesBestEffort } from '@/lib/pwa/clear-user-caches'

const PURGE_TIMEOUT_MS = 700

function clearLocalIdentityCache(): void {
  try {
    localStorage.removeItem('ko_identity')
  } catch {
    // localStorage 不可でもログアウト遷移は続行する。
  }
}

async function purgeThenRedirect(): Promise<void> {
  try {
    await Promise.race([
      clearUserCachesBestEffort(),
      new Promise<void>((resolve) => setTimeout(resolve, PURGE_TIMEOUT_MS)),
    ])
  } finally {
    // purge が失敗・timeout しても Access のログアウトへは必ず遷移する
    window.location.assign(ACCESS_LOGOUT_URL)
  }
}

/** Access 遷移前に、現在ユーザーのローカル identity・キャッシュ・オフラインキューを破棄する。 */
export function signOut(): void {
  clearLocalIdentityCache()
  purgeThenRedirect().catch(() => undefined)
}
