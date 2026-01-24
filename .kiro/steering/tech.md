# Technology Stack & Decisions

## アーキテクチャの方針

KeepOn は **Edge-First** アーキテクチャを採用し、グローバルな低レイテンシーアクセスと高いスケーラビリティを実現します。

### Edge Runtime への最適化

- Cloudflare Workers での動作を前提とした設計
- Node.js 固有 API を避け、Web 標準 API を優先
- バンドルサイズの最小化（25MB gzipped 制限）

## コアテクノロジー

### フロントエンド

- **Next.js 16**: App Router + Turbopack による高速開発体験
- **React 19**: Server Components をデフォルトとし、必要な箇所のみ Client Component 化
- **Tailwind CSS v4.x**: ユーティリティファーストの CSS フレームワーク

**パターン:**

- Server Components による初期レンダリングの高速化
- Client Components は状態管理・インタラクション時のみ（`"use client"` ディレクティブで明示）

### UI / テーマ設計

- **`next-themes` + class ベースのダークモード**: `darkMode: 'class'` でライト/ダーク切替を統一
- **CSS 変数トークン**: `src/app/globals.css` に Radix Colors ベースのトークンを定義（shadcn/ui 互換）
- **バリアント設計**: `class-variance-authority` + `cn()`（`clsx` + `tailwind-merge`）でクラス合成を統一

### フォーム・入力バリデーション

- **React Hook Form + Zod**: フォーム状態管理とスキーマ駆動バリデーション
- Zod スキーマは `src/schemas/` に集約し、`@hookform/resolvers/zod` で統合

### 認証

- **Clerk**: Edge Runtime 対応の認証プロバイダー
- JWT 検証を Edge で実施し、低レイテンシーを実現
- `auth()` はサーバー側、`useAuth()` はクライアント側で使い分け
- Next.js Middleware で公開ルートを判定し、保護ルートは `auth().protect()` でガード

### データベース・ORM

- **Supabase (PostgreSQL)**: マネージドな PostgreSQL サービス
- **Prisma v7.x**: Driver Adapter による Edge 互換構成

**重要な設定:**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

**接続パターン:**

- Transaction Mode (Port 6543) + `?pgbouncer=true`
- `@prisma/adapter-pg` による Driver Adapter 使用（`DATABASE_URL`）
- Prisma Client インスタンスは `src/lib/db.ts` で一元管理
- `prisma/prisma.config.ts` で schema/migrations と `DIRECT_URL` を管理

### デプロイ

- **OpenNext + Cloudflare Workers**: Next.js アプリを Cloudflare Workers で動作
- `@opennextjs/cloudflare` による自動変換
- `wrangler.jsonc` での Workers 設定（`nodejs_compat` フラグ必須）
- OpenNext のインクリメンタルキャッシュは Cloudflare KV（`NEXT_INC_CACHE_KV`）を利用

### CI/CD

- GitHub Actions で lint/test/build を実行し、main への push で自動デプロイ
- docs-only 変更は軽量ゲートでスキップ（品質ゲートは維持）

### 環境変数管理

- **dotenvx**: 環境変数の暗号化管理
- `.env` を暗号化してリポジトリにコミット可能
- `.env.keys` はローカルのみ（**絶対にコミットしない**）

## 技術的な制約と対応

### Cloudflare Workers の制限

| 制約 | 対応 |
| --- | --- |
| バンドルサイズ 25MB gzipped | 必要なライブラリのみインポート、Tree-shaking の活用 |
| Node.js API 使用不可 | Web 標準 API の使用、Edge Runtime 互換ライブラリの選定 |
| 長時間実行不可 | ステートレスな設計、バックグラウンド処理は別サービス化 |

### Prisma Driver Adapter

- Prisma 7 の Driver Adapter を利用し、Edge 互換の接続を実現
- `@prisma/adapter-pg` + 接続文字列で Postgres に接続
- Supabase 利用時は Transaction Mode（Port 6543）+ `?pgbouncer=true` を推奨

## 開発ツール

- **pnpm**: 高速で効率的なパッケージマネージャー
- **mise**: タスクランナー・ツールバージョン管理
- **Ultracite (Biome)**: 統合フォーマッター・Linter（Prettier + ESLint を置き換え）
- **markdownlint**: Markdown ドキュメント品質チェック
- **Vitest**: 単体テストランナー + カバレッジレポート
- **Storybook**: UI コンポーネントの開発・ドキュメント化（Next.js + Vite builder）

### Ultracite (Biome) 設定

**コードスタイル:**

- シングルクォート
- セミコロンなし（`asNeeded`）
- 行幅: 100文字
- Trailing commas: ES5 準拠

**拡張プリセット:**

- `ultracite/biome/core`
- `ultracite/biome/react`
- `ultracite/biome/next`

**除外パターン:**

- `node_modules/`, `.next/`, `.open-next/`, `out/`, `build/`, `dist/`
- `src/generated/` (Prisma Client 自動生成ファイル)

### mise タスク

```toml
# mise.toml で定義されたタスク
format  # Ultracite + Taplo + Markdownlint
lint    # 型チェック + Biome + Markdown + YAML
check   # ローカル確認（format + lint）
ci      # CI 相当のチェック（lint）
```

- lint は `lint:types` / `lint:biome` / `lint:md` / `lint:yaml` に分割し、必要に応じて個別実行
- deploy 系（`deploy`, `deploy:preview`）も mise で統一実行

## PWA 対応

- `public/manifest.json` による PWA 定義
- iOS 対応のメタタグ設定
- Service Worker による将来的なオフライン対応（未実装）

## エラーハンドリング

- **@praha/byethrow**: Result型による関数型エラーハンドリング
- **@praha/error-factory**: カスタムエラークラスのファクトリー

**パターン:**

- `Result.pipe` による処理の連鎖（Railway Oriented Programming）
- `ErrorFactory` でのカスタムエラー定義（型安全なフィールド付き）
- Exhaustive check によるコンパイル時エラーハンドリング保証

**例:**

```tsx
// src/app/actions/habits/create.ts
export class ValidationError extends ErrorFactory({
  name: 'ValidationError',
  message: 'Validation failed',
  fields: ErrorFactory.fields<{ field: string; reason: string }>(),
}) {}

const result = await Result.pipe(
  userIdResult,
  Result.andThen((userId) => validateHabitInput(userId, formData)),
  Result.andThen(async (input) =>
    await Result.try({
      try: async () => createHabitQuery(input),
      catch: (error) => new DatabaseError({ cause: error }),
    })()
  )
)

if (Result.isSuccess(result)) {
  // 成功処理
}
```

## テスト

- **Vitest**: 高速な単体テストランナー
- **React Testing Library**: コンポーネントテスト
- **カバレッジレポート**: `@vitest/coverage-v8`

**パターン:**

- テストファイル: `*.test.ts` / `*.test.tsx`（対象ファイルと同じディレクトリ）
- ユニットテストファースト

**例:**

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { myFunction } from './utils'

describe('myFunction', () => {
  it('正しく動作する', () => {
    expect(myFunction()).toBe('expected')
  })
})
```

## セキュリティ原則

- **認証検証**: すべての保護されたエンドポイントで `auth()` による JWT 検証
- **環境変数暗号化**: dotenvx による機密情報の暗号化管理
- **入力検証**: Result型 + ErrorFactory による型安全なバリデーション
- **XSS 対策**: React のデフォルト挙動 + DOMPurify（必要時）
