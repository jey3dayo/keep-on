/** Background Sync のタグ名（sw.js と同期すること） */
export const SW_SYNC_TAG = 'sync-checkins' as const

/** APIが返す、オフラインキューから削除して次へ進めるHTTPステータス */
export const OFFLINE_CHECKIN_NON_RETRYABLE_STATUSES = Object.freeze([400, 403, 404, 409, 422])

export function isNonRetryableOfflineCheckinStatus(status: number): boolean {
  return OFFLINE_CHECKIN_NON_RETRYABLE_STATUSES.includes(status)
}

/** SW → クライアント メッセージタイプ（sw.js と同期すること） */
export const SW_MSG_SYNC_COMPLETE = 'SYNC_CHECKINS_COMPLETE' as const
export const SW_MSG_SKIP_WAITING = 'SKIP_WAITING' as const

/** クライアント → SW メッセージタイプ（sw.js と同期すること） */
export const SW_MSG_CLEAR_USER_CACHE = 'CLEAR_USER_CACHE' as const

/** SW キャッシュ名のプレフィックス（sw.js の CACHE_NAME はビルド連動のため前方一致で扱う） */
export const SW_CACHE_NAME_PREFIX = 'keepon-' as const

/** ユーザー固有 HTML をキャッシュするルート（sw.js の CACHEABLE_ROUTES と同期すること） */
export const SW_USER_CACHEABLE_ROUTE_PREFIXES = ['/dashboard', '/habits', '/analytics'] as const

/** SW → クライアント: ナビゲーション SWR（stale-while-revalidate）関連（sw.js と同期すること） */
export const SW_MSG_NAV_STALE_SERVED = 'NAV_STALE_SERVED' as const
export const SW_MSG_NAV_REVALIDATED = 'NAV_REVALIDATED' as const
export const SW_MSG_NAV_AUTH_LOST = 'NAV_AUTH_LOST' as const

/** ナビゲーション SWR で stale 提供を許す上限（sw.js と同期すること） */
export const SW_NAV_STALE_MAX_AGE_MS = 60 * 60 * 1000
