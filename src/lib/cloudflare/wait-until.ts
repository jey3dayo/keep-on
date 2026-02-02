/**
 * Cloudflare Workers の waitUntil を使用してバックグラウンドタスクを実行
 *
 * Workers 環境では ctx.waitUntil() でレスポンスをブロックせずにタスクを実行できる。
 * 非 Workers 環境では通常の await で実行。
 */

/**
 * Workers ランタイムかどうかを判定
 */
function isWorkersRuntime(): boolean {
  return typeof globalThis !== 'undefined' && 'caches' in globalThis
}

/**
 * バックグラウンドタスクを実行
 *
 * @param fn 実行する非同期関数
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * // キャッシュ無効化をバックグラウンドで実行
 * await runWithWaitUntil(async () => {
 *   await invalidateCache(userId)
 * })
 * ```
 */
export async function runWithWaitUntil(fn: () => Promise<void>): Promise<void> {
  if (isWorkersRuntime()) {
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare')
      const { ctx } = getCloudflareContext()
      ctx.waitUntil(fn())
      return
    } catch {
      // Cloudflare コンテキストが取得できない場合は通常の await にフォールバック
    }
  }

  // 非 Workers 環境またはコンテキスト取得失敗時は通常の await
  await fn()
}
