'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    // iOS standalone では body だけ塗ると safe-area がブラウザ既定色のまま残り、
    // 暗い画面の周囲に白帯が出る。html にも同じ背景を敷く
    <html lang="ja" style={{ background: '#0f172a' }}>
      <body
        style={{
          alignItems: 'center',
          background: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          fontFamily: 'sans-serif',
          height: '100vh',
          justifyContent: 'center',
          margin: 0,
        }}
      >
        <div style={{ maxWidth: '28rem', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.75rem' }}>エラーが発生しました</p>
          <p style={{ color: '#cbd5e1', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            ご不便をおかけして申し訳ありません。もう一度お試しください。
          </p>
          <button
            onClick={reset}
            style={{
              background: '#2563eb',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              padding: '0.5rem 1.25rem',
            }}
            type="button"
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  )
}
