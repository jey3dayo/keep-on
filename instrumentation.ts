/**
 * Next.js Instrumentation
 * アプリケーション起動時に実行される
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Edge Runtime (Cloudflare Workers) でのみ Sentry を初期化
  if (process.env.NEXT_RUNTIME === 'edge') {
    await initSentryForEdge()
  }
}

async function initSentryForEdge() {
  const { CloudflareClient, getDefaultIntegrations } = await import('@sentry/cloudflare')
  const { makeFetchTransport, defaultStackParser } = await import('@sentry/core')

  // SENTRY_DSN が設定されていない場合はスキップ
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN is not set. Sentry will not be initialized.')
    return
  }

  const client = new CloudflareClient({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NEXTJS_ENV || 'production',

    // パフォーマンス監視のサンプリングレート
    // 本番環境では 0.1-0.2 程度に下げる（コスト削減）
    tracesSampleRate: process.env.NEXTJS_ENV === 'production' ? 0.1 : 1.0,

    // デフォルトのインテグレーションを使用
    integrations: getDefaultIntegrations({}),

    // トランスポート（Fetch API を使用）
    transport: makeFetchTransport,

    // スタックパーサー
    stackParser: defaultStackParser,

    // エラーのフィルタリング
    beforeSend(event) {
      // 開発環境では常にログを出力
      if (process.env.NEXTJS_ENV !== 'production') {
        console.error('Sentry event:', event)
      }

      // 特定のエラーを無視する場合
      if (event.exception?.values?.[0]?.value?.includes('user cancelled')) {
        return null
      }

      return event
    },
  })

  // グローバルクライアントとして設定
  const { setCurrentClient } = await import('@sentry/cloudflare')
  setCurrentClient(client)
  client.init()

  console.log('✅ Sentry initialized for Edge Runtime')
}
