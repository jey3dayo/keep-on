'use client'

import { ACCESS_LOGOUT_URL } from '@/constants/auth'
import { SW_MSG_CLEAR_USER_CACHE } from '@/constants/pwa'

function clearLocalIdentityCache(): void {
  try {
    localStorage.removeItem('ko_identity')
  } catch {
    // localStorage 不可でもログアウト遷移は続行する。
  }
}

function requestUserCacheClear(): void {
  if (typeof navigator !== 'undefined') {
    navigator.serviceWorker?.controller?.postMessage({ type: SW_MSG_CLEAR_USER_CACHE })
  }
}

/** Access 遷移前に、現在ユーザーのローカル identity・キャッシュ・オフラインキューを破棄する。 */
export function signOut(): void {
  clearLocalIdentityCache()
  requestUserCacheClear()
  window.location.assign(ACCESS_LOGOUT_URL)
}
