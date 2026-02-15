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

- **React Hook Form + Valibot**: フォーム状態管理とスキーマ駆動バリデーション
- Valibot スキーマは `src/schemas/` に集約し、`@hookform/resolvers/valibot` で統合

### 認証

- **Clerk**: Edge Runtime 対応の認証プロバイダー
- JWT 検証を Edge で実施し、低レイテンシーを実現
- `auth()` はサーバー側、`useAuth()` はクライアント側で使い分け
- Next.js Middleware で公開ルートを判定し、保護ルートは `auth().protect()` でガード

### データベース・ORM

- **Cloudflare D1 (SQLite)**: Workers ネイティブのデータベース。`wrangler.jsonc` の `d1_databases` バインディングを利用
- **Drizzle ORM**: 型安全なクエリとスキーマ管理（`drizzle-orm/d1`）
- **drizzle-kit**: マイグレーション/スキーマ生成（`drizzle.config.ts` は `dialect: 'sqlite'`）

**接続パターン:**

- `src/db/schema.ts` にスキーマ定義を集約
- `src/lib/db.ts` で接続ロジックを一元化し、`getCloudflareContext().env.DB` から D1 を取得して `drizzle()` を生成
- D1 バインディングは `wrangler.jsonc` の `d1_databases` で `DB` として提供
- 接続生成はモジュールスコープのキャッシュで再利用し、多重初期化を回避

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
- **Valibot による実行時バリデーション**: `src/env.ts` でスキーマ定義
- **Cloudflare Workers 対応**: `SKIP_ENV_VALIDATION` でバリデーションをスキップ可能

## 技術的な制約と対応

### Cloudflare Workers の制限

| 制約                        | 対応                                                   |
| --------------------------- | ------------------------------------------------------ |
| バンドルサイズ 25MB gzipped | 必要なライブラリのみインポート、Tree-shaking の活用    |
| Node.js API 使用不可        | Web 標準 API の使用、Edge Runtime 互換ライブラリの選定 |
| 長時間実行不可              | ステートレスな設計、バックグラウンド処理は別サービス化 |

### データベース接続と Edge 対応

- Workers ネイティブの D1 を採用し、`drizzle-orm/d1` で接続
- `getCloudflareContext().env.DB` を使った D1 バインディング取得を基本とする
- 接続初期化はキャッシュで再利用して多重初期化を回避

## 開発ツール

- **pnpm**: 高速で効率的なパッケージマネージャー
- **mise**: タスクランナー・ツールバージョン管理
- **Ultracite (Biome)**: 統合フォーマッター・Linter（Prettier + ESLint を置き換え）
- **markdownlint**: Markdown ドキュメント品質チェック
- **drizzle-kit**: マイグレーション/スキーマ生成ツール
- **Vitest**: 単体テストランナー + カバレッジレポート
- **Storybook**: UI コンポーネントの開発・ドキュメント化（Next.js + Vite builder）

### Ultracite (Biome) 設定

**コードスタイル:**

- シングルクォート
- セミコロンなし（`asNeeded`）
- 行幅: 120文字
- Trailing commas: ES5 準拠

**拡張プリセット:**

- `ultracite/biome/core`
- `ultracite/biome/react`
- `ultracite/biome/next`

**除外パターン:**

- `node_modules/`, `.next/`, `.open-next/`, `out/`, `build/`, `dist/`
- `src/generated/`（自動生成ファイル）
- `src/components/ui/`（shadcn/ui 由来のプリミティブ）

### mise タスク

```toml
# mise.toml で定義されたタスク
format       # Ultracite + Taplo + Markdownlint(--fix)
lint         # 型チェック + Biome + Markdown + YAML
check        # ローカル確認（format + lint）
check:quick  # クイックチェック（型 + Biome）
ci           # CI 相当のチェック（format + 型 + Markdown + YAML + DBML生成）
```

- lint は `lint:types` / `lint:biome` / `lint:md` / `lint:yaml` に分割し、必要に応じて個別実行
- deploy 系（`deploy`, `deploy:preview`）も mise で統一実行

## PWA 対応

- `public/manifest.json` による PWA 定義
- iOS 対応のメタタグ設定
- `public/sw.js` によるキャッシュ戦略とオフラインページへのフォールバック

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
  name: "ValidationError",
  message: "Validation failed",
  fields: ErrorFactory.fields<{ field: string; reason: string }>(),
}) {}

const result = await Result.pipe(
  userIdResult,
  Result.andThen((userId) => validateHabitInput(userId, formData)),
  Result.andThen(
    async (input) =>
      await Result.try({
        try: async () => createHabitQuery(input),
        catch: (error) => new DatabaseError({ cause: error }),
      })(),
  ),
);

if (Result.isSuccess(result)) {
  // 成功処理
}
```

## ロギング / 観測性

- `src/lib/logging.ts` に軽量ログユーティリティを集約
- `LOG_LEVEL`（debug/info/warn/error）で出力制御し、デフォルトは info
- `logSpan` で処理時間・タイムアウトの簡易計測と構造化ログ

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
import { describe, it, expect } from "vitest";
import { myFunction } from "./utils";

describe("myFunction", () => {
  it("正しく動作する", () => {
    expect(myFunction()).toBe("expected");
  });
});
```

## セキュリティ原則

- **認証検証**: すべての保護されたエンドポイントで `auth()` による JWT 検証
- **環境変数暗号化**: dotenvx による機密情報の暗号化管理
- **入力検証**: Result型 + ErrorFactory による型安全なバリデーション
- **XSS 対策**: React のデフォルト挙動 + DOMPurify（必要時）
