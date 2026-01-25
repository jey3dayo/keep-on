# Project Structure & Organization

## ディレクトリ構成パターン

KeepOn は **機能ベースの構成** と **レイヤー分離** を組み合わせた構造を採用しています。

```text
keep-on/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── actions/      # Server Actions
│   │   ├── (dashboard)/  # 認証後のダッシュボード群
│   │   └── api/          # API Routes（必要時）
│   ├── components/       # 共有 UI コンポーネント
│   │   ├── ui/           # shadcn/ui プリミティブ
│   │   ├── habits/       # 機能別 UI
│   │   └── dashboard/    # ダッシュボード UI
│   ├── db/               # Drizzle スキーマ
│   ├── hooks/            # 共有カスタム Hooks
│   ├── lib/              # ユーティリティ・共通ロジック
│   ├── schemas/          # Zod スキーマ
│   ├── validators/       # バリデーション（Result 型）
│   ├── types/            # 共有型定義
│   └── generated/        # 自動生成ファイル
├── public/               # 静的アセット・PWA ファイル
├── drizzle.config.ts     # Drizzle 設定
├── open-next.config.ts   # OpenNext 設定
└── wrangler.jsonc        # Cloudflare Workers 設定
```

## 各ディレクトリの役割

### `src/app/` - App Router

Next.js 16 App Router の規約に従ったページ・レイアウト構成。

**パターン:**

- **Server Component がデフォルト**: 特に指定しない限り Server Component
- **Client Component は明示**: `"use client"` ディレクティブで宣言
- **ルーティング**: ファイルシステムベースのルーティング
- **テーマ変数の集中管理**: `globals.css` に CSS 変数トークン（Radix Colors ベース）を定義

**例:**

```text
src/app/
├── layout.tsx          # Root Layout (Server Component)
├── page.tsx            # Home Page (Server Component)
├── actions/
│   └── habits/
│       └── create.ts   # 習慣作成の Server Action
├── (dashboard)/        # Route Group
│   ├── layout.tsx       # ダッシュボード共通レイアウト
│   ├── dashboard/
│   │   ├── page.tsx        # ダッシュボードページ
│   │   └── DashboardClient.tsx  # Client Component
│   ├── analytics/
│   │   └── page.tsx
│   ├── habits/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── help/
│       └── page.tsx
├── sign-in/[[...sign-in]]/
│   └── page.tsx        # Clerk サインインページ
└── sign-up/[[...sign-up]]/
    └── page.tsx        # Clerk サインアップページ
```

### `src/app/actions/` - Server Actions

Next.js 16 App Router の Server Actions を配置。

**パターン:**

- `"use server"` ディレクティブで明示
- フォーム処理・データ変更操作に使用
- Result型によるエラーハンドリング
- `revalidatePath` でキャッシュ無効化

**例:**

```tsx
// src/app/actions/habits/create.ts
'use server'

import { Result } from '@praha/byethrow'
import { revalidatePath } from 'next/cache'

export async function createHabit(formData: FormData) {
  const result = await Result.pipe(
    await authenticateUser(),
    Result.andThen((userId) => validateHabitInput(userId, formData)),
    Result.andThen(async (input) =>
      await Result.try({
        try: async () => createHabitQuery(input),
        catch: (error) => new DatabaseError({ cause: error }),
      })()
    )
  )

  if (Result.isSuccess(result)) {
    revalidatePath('/dashboard')
    return { success: true }
  }

  return { error: result.error.message }
}
```

### `src/lib/` - ユーティリティ・共通ロジック

データベース接続、ユーティリティ関数、共通ロジックを配置。

**重要なパターン:**

- `db.ts`: Drizzle 接続の一元管理（`getDb()`）
- `user.ts`: Clerk ユーザーを `users` テーブルへ同期（upsert）
- `queries/`: ドメインごとのDBアクセス層（habit/user など、Drizzle クエリ）
- `errors/`: ドメインエラー定義とシリアライズ変換
- テストファイル: `*.test.ts` / `__tests__/`（対象ファイルと同じディレクトリ or サブフォルダ）

**例:**

```tsx
// src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { cache } from 'react'
import * as schema from '@/db/schema'

const connectionString = process.env.DATABASE_URL!
export const getDb = cache(async () => drizzle(postgres(connectionString), { schema }))
```

### `src/db/` - Drizzle スキーマ

Drizzle のテーブル定義を集約。

**パターン:**

- `schema.ts` にテーブル/リレーション定義
- `drizzle.config.ts` でスキーマとマイグレーション出力を管理

**データモデル構造:**

```text
User (Clerk 認証ユーザー)
└── Habit (習慣)
    └── Checkin (チェックイン記録)
```

### `src/components/` - 共有 UI コンポーネント

再利用可能な UI コンポーネントを配置。

**命名規約:**

- PascalCase でファイル名を命名（例: `HabitCard.tsx`, `Button.tsx`）
- Client Component の場合は `"use client"` を明示
- テストファイル: `*.test.tsx`（コンポーネントと同じディレクトリ）

**構造:**

- トップレベル: 汎用コンポーネント（Button, Input など）
- サブディレクトリ: 機能別グルーピング（例: `habits/`）
- `ui/`: shadcn/ui 由来のプリミティブ（Radix ラッパー）

**Storybook:**

- `*.stories.tsx` をコンポーネントと同階層に配置
- UI の振る舞い・状態バリエーションをドキュメント化

### `src/hooks/` - 共有カスタム Hooks

UI/レスポンシブなどの汎用 Hook を集約。

**パターン:**

- `useXxx` 命名（例: `use-mobile.ts`）
- ブラウザ API 依存の Hook は Client Component から使用

### `src/schemas/` - Zod スキーマ

入力バリデーションのための Zod スキーマを集約。

**例:**

```ts
// src/schemas/habit.ts
import { z } from 'zod'

export const HabitInputSchema = z.object({
  name: z.string().trim().min(1),
  emoji: z.string().nullable(),
})
```

### `src/validators/` - バリデーション関数

Zod スキーマを使ったバリデーションを Result 型で返す層。

**パターン:**

- `validate*` 関数で `Result<ResultType, ValidationError>` を返す
- テストは `__tests__/` 配下に配置

### `src/generated/` - 自動生成ファイル

各種コード生成ツールの出力先。

**注意:**

- `.gitignore` に含める（リポジトリにコミットしない）
- 生成コマンドは利用ツールに準拠（例: `pnpm db:generate`）

### `public/` - 静的アセット・PWA

静的ファイルと PWA 関連ファイル。

**重要なファイル:**

- `manifest.json`: PWA 定義
- `favicon.ico`, `icon-*.png`: アプリアイコン（必要に応じて追加）
- その他の静的アセット（画像、フォントなど）

### `scripts/` - 運用・インフラ補助スクリプト

Cloudflare Secrets などの運用初期化・補助スクリプトを配置。

### `.github/workflows/` - CI/CD

lint/test/build/デプロイのワークフローを定義（docs-only の変更は軽量ゲート）。

## インポートパターン

### エイリアス設定

`@/` を使用して `src/` ディレクトリからの絶対パスインポート。

**良い例:**

```tsx
import { getDb } from '@/lib/db'
import { habits } from '@/db/schema'
```

**悪い例:**

```tsx
// ❌ 相対パスは避ける
import { getDb } from '../../lib/db'
```

## 命名規約

### ファイル名

- **コンポーネント**: PascalCase（例: `HabitCard.tsx`）
- **UI プリミティブ（src/components/ui）**: lower-case（例: `button.tsx`, `input.tsx`）
- **ユーティリティ**: kebab-case または camelCase（例: `db.ts`, `date-utils.ts`）
- **ページ**: Next.js 規約に従う（`page.tsx`, `layout.tsx`）

### 変数・関数

- **変数**: camelCase（例: `userId`, `habitList`）
- **コンポーネント**: PascalCase（例: `HabitCard`, `CheckinButton`）
- **定数**: UPPER_SNAKE_CASE（例: `MAX_HABIT_COUNT`）

## 設定ファイル

### ルートディレクトリの主要設定

- `package.json`: 依存関係・スクリプト定義
- `tsconfig.json`: TypeScript 設定
- `next.config.ts`: Next.js 設定
- `tailwind.config.ts`: Tailwind CSS 設定
- `open-next.config.ts`: OpenNext 設定
- `wrangler.jsonc`: Cloudflare Workers 設定
- `mise.toml`: mise タスク定義
- `.env`: 環境変数（暗号化推奨）
- `.gitignore`: Git 除外設定

## ワークフロー

### 開発フロー

1. `pnpm dev`: 開発サーバー起動
2. `mise run check`: ローカルチェック（format + lint）
3. `pnpm db:push`: スキーマ同期（開発時）

### デプロイフロー

1. `mise run ci`: CI チェック（lint）
2. `pnpm build:cf`: OpenNext ビルド
3. `pnpm deploy`: Cloudflare Workers デプロイ

### データベースマイグレーション

1. `pnpm db:generate`: マイグレーション生成
2. `pnpm db:migrate`: マイグレーション適用
