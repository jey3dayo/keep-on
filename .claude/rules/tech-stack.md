---
paths:
  - "**/*.{ts,tsx}"
---

# 技術スタック

## 採用技術

| カテゴリ       | 技術                           | バージョン/備考            |
| -------------- | ------------------------------ | -------------------------- |
| フロントエンド | Next.js 16                     | App Router, Turbopack      |
| エッジデプロイ | OpenNext + Cloudflare Workers  | @opennextjs/cloudflare     |
| 認証           | Cloudflare Access (Zero Trust) | JWT を Edge で JWKS 検証   |
| ORM            | Drizzle ORM                    | d1 adapter                 |
| DB             | Cloudflare D1                  | SQLite                     |
| バリデーション | Valibot                        | 軽量 (~5KB)、Tree-shakable |
| 環境変数       | dotenvx                        | 暗号化管理                 |
| スタイリング   | Tailwind CSS                   | v4.x                       |
| PWA            | manifest.json + Service Worker | iOS対応                    |

実行時の環境変数スキーマは `src/schemas/env.ts` で管理します。

## Drizzle ORM 構成

### 構成

- スキーマ定義: `src/db/schema.ts`
- DB接続: `drizzle-orm/d1`（`src/lib/db.ts` の `getDb()`）
- Cloudflare D1 は Workers バインディング経由で接続

### 特徴

Cloudflare Workers で動作する軽量ORM。

## Cloudflare Workers 制約

### 制限事項

- バンドルサイズ: 25MB gzipped 制限
- nodejs_compat フラグ必須（wrangler.jsonc）
- Node.js API は `nodejs_compat` が提供する範囲だけ使える

### 対応方法

- Edge Runtime 互換のコードのみ使用
- Node.js API を使う前に、Workers の Node.js 互換ドキュメントで対応状況を確認する
- Drizzle ORM（`drizzle-orm/d1`）を使用
