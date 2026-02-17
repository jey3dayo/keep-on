/**
 * 同期インジケーターの表示遅延（ミリ秒）
 *
 * UI/UXベストプラクティス:
 * - 300ms以内に完了する処理ではローディング表示を行わない
 * - 短時間の処理でUIがチカチカするのを防ぐ
 *
 * @see https://material.io/design/communication/data-loading.html
 */
export const SYNC_INDICATOR_DELAY_MS = 300

/**
 * 同期インジケーターの最低表示時間（ミリ秒）
 *
 * UI/UXベストプラクティス:
 * - 一度表示したインジケーターはすぐに消さない
 * - ユーザーが状態変化を認識できる時間を確保
 * - チカチカするUIを防ぐ
 *
 * @see https://material.io/design/communication/data-loading.html
 */
export const SYNC_INDICATOR_MIN_DISPLAY_MS = 500
