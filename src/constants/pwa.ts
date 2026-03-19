/** Background Sync のタグ名（sw.js と同期すること） */
export const SW_SYNC_TAG = 'sync-checkins' as const

/** SW → クライアント メッセージタイプ（sw.js と同期すること） */
export const SW_MSG_SYNC_COMPLETE = 'SYNC_CHECKINS_COMPLETE' as const
export const SW_MSG_SKIP_WAITING = 'SKIP_WAITING' as const
