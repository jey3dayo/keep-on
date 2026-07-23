import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#000000',
    description: '習慣トラッキングアプリ',
    display: 'standalone',
    icons: [
      {
        purpose: 'any',
        sizes: '192x192',
        src: '/icon-192.png',
        type: 'image/png',
      },
      {
        purpose: 'any',
        sizes: '512x512',
        src: '/icon-512.png',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        sizes: '192x192',
        src: '/icon-maskable-192.png',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        sizes: '512x512',
        src: '/icon-maskable-512.png',
        type: 'image/png',
      },
    ],
    id: '/',
    name: 'KeepOn',
    orientation: 'portrait',
    scope: '/',
    short_name: 'KeepOn',
    start_url: '/?source=pwa',
    theme_color: '#000000',
  }
}
