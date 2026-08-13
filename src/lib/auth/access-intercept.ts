/**
 * Cloudflare Access のセッション切れ時、fetch はログインページの HTML を
 * 200（redirect follow 後）で返すことがある。
 * res.ok のケースに限定して使う: redirected または非 JSON なら Access 割り込み。
 */
export function isAuthInterceptedResponse(res: Response): boolean {
  if (res.redirected) {
    return true
  }
  const contentType = res.headers.get('content-type')
  return !contentType?.includes('application/json')
}
