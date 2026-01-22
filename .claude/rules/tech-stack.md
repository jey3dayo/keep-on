---
paths: "**/*.{ts,tsx}"
---

# 技術スタック

## 採用技術

| カテゴリ | 技術 | バージョン/備考 |
|---------|------|----------------|
| フロントエンド | Next.js 15 | App Router, Turbopack |
| エッジデプロイ | OpenNext + Cloudflare Workers | @opennextjs/cloudflare |
| 認証 | Clerk | @clerk/nextjs (Edge対応) |
| ORM | Prisma | v6.16.0+ (no-engine mode) |
| DB | Supabase | PostgreSQL (Transaction Mode) |
| 環境変数 | dotenvx | 暗号化管理 |
| スタイリング | Tailwind CSS | v4.x |
| PWA | manifest.json + Service Worker | iOS対応 |

## Prisma no-engine モード

**必須設定:**
- `engineType = "client"` を設定（schema.prisma）
- Driver Adapter（@prisma/adapter-pg）が必須
- Supabase は Transaction Mode (port 6543) + `?pgbouncer=true` を使用

**理由:**
Cloudflare Workers では通常の Prisma Engine が動作しないため、no-engine モードが必須です。

## Cloudflare Workers 制約

**制限事項:**
- バンドルサイズ: 25MB gzipped 制限
- nodejs_compat フラグ必須（wrangler.jsonc）
- Node.js 固有 API は使用不可

**対応方法:**
- Edge Runtime 互換のコードのみ使用
- `fs`, `path`, `crypto` などの Node.js API は避ける
- Prisma は no-engine モード + Driver Adapter を使用
