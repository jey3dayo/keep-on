import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import type { NextConfig } from 'next'

// 開発環境でCloudflare Context APIを利用可能にする
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev()
}

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Pragma', value: 'no-cache' },
          // Security headers
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob: https://img.clerk.com; " +
              "font-src 'self' data:; " +
              `connect-src 'self' https://clerk.com https://*.clerk.accounts.dev https://keep-on.j138cm.workers.dev${isDev ? ' ws: wss:' : ''}; ` +
              "worker-src 'self' blob:; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self';",
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
}

export default nextConfig
