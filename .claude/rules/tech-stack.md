---
paths: "**/*.{ts,tsx}"
---

# 技術スタック

## 採用技術

| カテゴリ       | 技術                           | バージョン/備考               |
| -------------- | ------------------------------ | ----------------------------- |
| フロントエンド | Next.js 15                     | App Router, Turbopack         |
| エッジデプロイ | OpenNext + Cloudflare Workers  | @opennextjs/cloudflare        |
| 認証           | Clerk                          | @clerk/nextjs (Edge対応)      |
| ORM            | Drizzle ORM                    | postgres-js adapter           |
| DB             | Supabase                       | PostgreSQL (Transaction Mode) |
| バリデーション | Valibot                        | 軽量 (~5KB)、Tree-shakable    |
| 環境変数       | dotenvx                        | 暗号化管理                    |
| スタイリング   | Tailwind CSS                   | v4.x                          |
| PWA            | manifest.json + Service Worker | iOS対応                       |

## Drizzle ORM 構成

**構成:**

- スキーマ定義: `src/db/schema.ts`
- DB接続: `postgres-js` (Edge Runtime互換)
- Supabase は Transaction Mode (port 6543) + `?pgbouncer=true` を使用

**特徴:**
Cloudflare Workers で完全動作する軽量ORM。Prisma v7のWASM問題を回避。

## Cloudflare Workers 制約

**制限事項:**

- バンドルサイズ: 25MB gzipped 制限
- nodejs_compat フラグ必須（wrangler.jsonc）
- Node.js 固有 API は使用不可

**対応方法:**

- Edge Runtime 互換のコードのみ使用
- `fs`, `path`, `crypto` などの Node.js API は避ける
- Drizzle ORM + postgres-js を使用
