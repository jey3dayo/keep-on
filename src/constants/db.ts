/**
 * データベース接続設定定数
 */

/** 接続プール最大サイズ（並行RSCリクエストを吸収） */
export const DB_CONNECTION_POOL_MAX = 2

/** アイドル接続タイムアウト（秒）- 早めに解放 */
export const DB_IDLE_TIMEOUT = 5

/** 接続タイムアウト（秒）- 失敗を速く検出 */
export const DB_CONNECT_TIMEOUT = 3

/** 接続の最大生存時間（秒）- 定期的にリフレッシュ */
export const DB_MAX_LIFETIME = 30

/** ステートメントタイムアウト（ミリ秒）- クエリのハングを防ぐ */
export const DB_STATEMENT_TIMEOUT = 5000
