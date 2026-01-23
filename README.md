# KeepOn

ストリーク/習慣トラッキングの PWA アプリ（MVP）

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router, Turbopack)
- **デプロイ**: Cloudflare Workers (OpenNext)
- **認証**: Clerk
- **DB**: Supabase (PostgreSQL)
- **ORM**: Prisma 7 (no-engine mode)
- **環境変数**: dotenvx
- **テスト**: Vitest + React Testing Library
- **PWA**: manifest.json

## 本番環境

- **URL**: https://keep-on.j138cm.workers.dev
- **デプロイ**: GitHub Actions (main ブランチへのプッシュで自動デプロイ)

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

このプロジェクトは dotenvx で環境変数を暗号化管理しています。

#### 初回セットアップ（新規開発者）

1. プロジェクト管理者から `DOTENV_PRIVATE_KEY` を取得
2. 環境変数として設定:

   ```bash
   export DOTENV_PRIVATE_KEY="取得した秘密鍵"
   ```

3. 復号して実行:

   ```bash
   pnpm env:run -- pnpm dev
   ```

詳細な使い方は `.claude/rules/dotenvx.md` を参照してください。

#### 認証情報の取得先

- **Clerk**: https://dashboard.clerk.com/
- **Supabase**: https://supabase.com/dashboard

### 3. Prisma Client の生成

```bash
pnpm db:generate
```

### 4. 開発サーバー起動

```bash
pnpm dev
```

http://localhost:3000 でアプリが起動します。

## テスト

このプロジェクトでは Vitest を使用しています。

### テストの実行

```bash
pnpm test              # watch モードでテスト実行
pnpm test:run          # 1回だけテスト実行
pnpm test:ui           # UI モードでテスト実行
pnpm test:coverage     # カバレッジ付きテスト実行
```

### テストファイルの作成

- ユニットテスト: `*.test.ts` または `*.test.tsx`
- テストファイルは対象ファイルと同じディレクトリに配置

### 例

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './utils';

describe('myFunction', () => {
  it('正しく動作する', () => {
    expect(myFunction()).toBe('expected');
  });
});
```

## コマンド

```bash
# 開発
pnpm dev              # 開発サーバー起動

# テスト
pnpm test             # テスト実行（watch モード）
pnpm test:ui          # UI モードでテスト実行
pnpm test:run         # テスト実行（1回のみ）
pnpm test:coverage    # カバレッジ付きテスト実行

# データベース
pnpm db:generate      # Prisma Client 生成
pnpm db:push          # スキーマ同期（dev用）
pnpm db:migrate       # マイグレーション作成
pnpm db:migrate:deploy # マイグレーション適用（本番）

# Cloudflare
pnpm build:cf         # OpenNext ビルド
pnpm deploy           # Cloudflare デプロイ
pnpm preview          # ローカルプレビュー

# mise タスク
mise run format       # Prettier 整形
mise run lint         # 型チェック + ESLint
mise run check        # ローカル確認
mise run ci           # CI チェック
mise run deploy       # Cloudflare デプロイ
mise run deploy:preview # ローカルプレビュー
```

## ディレクトリ構造

```text
keep-on/
├── .claude/          # Claude Code 設定
├── prisma/           # Prisma スキーマ
├── public/           # 静的アセット・PWA
├── src/
│   ├── app/          # Next.js App Router
│   ├── lib/          # ユーティリティ
│   ├── components/   # 共有コンポーネント
│   └── generated/    # Prisma Client（自動生成）
├── mise.toml         # mise タスク定義
├── open-next.config.ts  # OpenNext 設定
├── wrangler.jsonc    # Cloudflare Workers 設定
└── package.json
```

## デプロイ

### Infrastructure as Code 管理

このプロジェクトは IaC で環境を管理しています：

#### 設定ファイル（Git管理）

- `wrangler.jsonc`: Cloudflare Workers 設定（公開環境変数、KV Namespace）
- `.github/workflows/deploy.yml`: CI/CD パイプライン
- `mise.toml`: デプロイタスク定義

#### Secrets管理（Git管理外）

初回セットアップ時に以下のスクリプトで一括設定：

```bash
./scripts/setup-cloudflare-secrets.sh
```

または手動で設定：

```bash
echo '<value>' | pnpm wrangler secret put DATABASE_URL
echo '<value>' | pnpm wrangler secret put CLERK_SECRET_KEY
```

#### CI/CD 自動デプロイ

GitHub Secrets に以下を設定後、`main` ブランチへのプッシュで自動デプロイ：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DOTENV_PRIVATE_KEY`

詳細は `.claude/rules/cloudflare-deployment.md` を参照。

---

## 注意事項

- **Prisma 7 no-engine mode**: Driver Adapter で Edge Runtime に最適化
- **Supabase 接続**: Transaction Mode (port 6543) + `?pgbouncer=true` を使用
- **Cloudflare Workers**: バンドルサイズ 25MB gzipped 制限に注意
- **dotenvx**: 本番運用時は `.env` を暗号化してコミット

## 次のステップ

1. ✅ プロジェクト初期セットアップ完了
2. 🔄 Clerk と Supabase の認証情報を設定
3. 🔄 Prisma マイグレーション実行
4. 🔄 基本機能の実装（習慣作成／チェックイン／履歴表示）
5. 🔄 PWA アイコン作成（192x192, 512x512）
6. 🔄 CI/CD ワークフロー構築

## ライセンス

MIT
