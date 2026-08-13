/**
 * 開発フォールバック（Access ヘッダ無しでの疑似ログイン）を許可してよい環境か。
 *
 * fail-closed。「production でなければ許可」にすると、NODE_ENV を設定しない
 * Cloudflare Workers 環境で誤って有効化される。明示的に development のときだけ true。
 *
 * next/headers を import しないので、instrumentation など起動経路からも読める。
 */
export function isDevFallbackAllowed(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NEXTJS_ENV === 'development'
}
