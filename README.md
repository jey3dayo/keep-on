# KeepOn

ストリーク/習慣トラッキングの PWA アプリ（MVP）

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router, Turbopack)
- **デプロイ**: Cloudflare Workers (OpenNext)
- **認証**: Clerk
- **DB**: Supabase (PostgreSQL)
- **ORM**: Prisma v6.16+ (no-engine mode)
- **環境変数**: dotenvx
- **PWA**: manifest.json

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、以下の認証情報を設定:

- **Clerk**: https://dashboard.clerk.com/
- **Supabase**: https://supabase.com/dashboard

```bash
cp .env.example .env
# .env を編集して実際の認証情報を設定
```

### 3. Prisma Client の生成

```bash
pnpm db:generate
```

### 4. 開発サーバー起動

```bash
pnpm dev
```

http://localhost:3000 でアプリが起動します。

## コマンド

```bash
# 開発
pnpm dev              # 開発サーバー起動

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
```

## ディレクトリ構造

```
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

## 注意事項

- **Prisma no-engine mode**: `engineType = "client"` を使用し、Edge Runtime に最適化
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
