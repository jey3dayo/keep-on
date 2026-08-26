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
