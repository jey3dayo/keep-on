/**
 * Cloudflare Workers の waitUntil を使用してバックグラウンドタスクを実行
 *
 * Workers 環境では ctx.waitUntil() でレスポンスをブロックせずにタスクを実行できる。
 * 非 Workers 環境では通常の await で実行。
 */

/**
 * Workers ランタイムかどうかを判定
 *
 * Next.js の Edge Runtime 環境（Cloudflare Workers含む）を検出する。
 * ブラウザ環境でも caches が存在するため、NEXT_RUNTIME で判定。
 */
function isWorkersRuntime(): boolean {
  return typeof process !== 'undefined' && process.env?.NEXT_RUNTIME === 'edge'
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
