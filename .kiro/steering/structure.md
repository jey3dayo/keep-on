# Project Structure & Organization

## ディレクトリ構成パターン

KeepOn は **機能ベースの構成** と **レイヤー分離** を組み合わせた構造を採用しています。

```text
keep-on/
├── src/
│   ├── app/              # Next.js App Router
│   ├── lib/              # ユーティリティ・共通ロジック
│   ├── components/       # 共有 UI コンポーネント
│   └── generated/        # 自動生成ファイル
├── prisma/               # データベーススキーマ
├── public/               # 静的アセット・PWA ファイル
└── .claude/              # Claude Code プロジェクト設定
```

## 各ディレクトリの役割

### `src/app/` - App Router

Next.js 15 App Router の規約に従ったページ・レイアウト構成。

**パターン:**

- **Server Component がデフォルト**: 特に指定しない限り Server Component
- **Client Component は明示**: `"use client"` ディレクティブで宣言
- **ルーティング**: ファイルシステムベースのルーティング

**例:**

```text
src/app/
├── layout.tsx          # Root Layout (Server Component)
├── page.tsx            # Home Page (Server Component)
├── sign-in/[[...sign-in]]/
│   └── page.tsx        # Clerk サインインページ
└── sign-up/[[...sign-up]]/
    └── page.tsx        # Clerk サインアップページ
```

### `src/lib/` - ユーティリティ・共通ロジック

データベース接続、ユーティリティ関数、共通ロジックを配置。

**重要なパターン:**

- `db.ts`: Prisma Client インスタンスの一元管理
- **シングルトンパターン**: 複数のインスタンス化を避ける

**例:**

```tsx
// src/lib/db.ts
import { PrismaClient } from "@/generated/prisma";
import { Pool } from "@neondatabase/serverless";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
```

### `src/components/` - 共有 UI コンポーネント

再利用可能な UI コンポーネントを配置。

**命名規約:**

- PascalCase でファイル名を命名（例: `HabitCard.tsx`）
- Client Component の場合は `"use client"` を明示

### `src/generated/` - 自動生成ファイル

Prisma Client などの自動生成ファイル。

**注意:**

- `.gitignore` に含める（リポジトリにコミットしない）
- `pnpm db:generate` で生成

### `prisma/` - データベーススキーマ

Prisma スキーマとマイグレーションファイル。

**ファイル:**

- `schema.prisma`: データモデル定義
- `migrations/`: マイグレーション履歴

**データモデル構造:**

```text
User (Clerk 認証ユーザー)
└── Habit (習慣)
    └── Checkin (チェックイン記録)
```

### `public/` - 静的アセット・PWA

静的ファイルと PWA 関連ファイル。

**重要なファイル:**

- `manifest.json`: PWA 定義
- `favicon.ico`, `icon-*.png`: アプリアイコン
- その他の静的アセット（画像、フォントなど）

### `.claude/` - Claude Code 設定

プロジェクト固有の Claude Code 設定ファイル。

**ファイル:**

- `CLAUDE.md`: プロジェクト概要・コマンド一覧
- `rules/*.md`: 開発規約・技術スタック・セキュリティガイドライン

**注意:**

- `.kiro/` は steering ファイル（本ファイル）で言及しない

## インポートパターン

### エイリアス設定

`@/` を使用して `src/` ディレクトリからの絶対パスインポート。

**良い例:**

```tsx
import { prisma } from "@/lib/db";
import HabitCard from "@/components/HabitCard";
```

**悪い例:**

```tsx
// ❌ 相対パスは避ける
import { prisma } from "../../lib/db";
```

## 命名規約

### ファイル名

- **コンポーネント**: PascalCase（例: `HabitCard.tsx`）
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

1. `mise run ci`: CI チェック（lint + build）
2. `pnpm build:cf`: OpenNext ビルド
3. `pnpm deploy`: Cloudflare Workers デプロイ

### データベースマイグレーション

1. `pnpm db:migrate`: マイグレーション作成
2. `pnpm db:migrate:deploy`: 本番適用
