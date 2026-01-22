# KeepOn Project Configuration

## プロジェクト概要

KeepOn は、Next.js 15 + Cloudflare Workers + Prisma + Supabase + Clerk で構築された PWA アプリケーションです。

**主要技術:**

- Next.js 15 (App Router, Turbopack)
- OpenNext + Cloudflare Workers (Edge デプロイ)
- Prisma (no-engine mode) + Supabase
- Clerk (認証)
- Tailwind CSS v4.x

詳細な技術スタック情報は `.claude/rules/tech-stack.md` を参照してください。

## 利用 MCP サーバー

| MCP | 用途 |
|-----|------|
| context7 | 最新ライブラリドキュメント取得 |
| serena | セマンティックコード解析・編集 |
| greptile | PR/コードレビュー支援 |

## 利用 Skills

| Skill | 用途 |
|-------|------|
| kiro:spec-* | Spec-Driven Development |
| gh-address-comments | GitHub PR コメント対応 |
| ui-ux-pro-max | UI/UXデザイン支援 |
| web-design-guidelines | Web UIガイドライン準拠チェック（アクセシビリティ、UX） |
| react-best-practices | React/Next.jsパフォーマンス最適化ガイドライン |

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

# 環境変数
pnpm env:encrypt      # .env 暗号化
pnpm env:run -- <cmd> # 復号して実行

# mise タスク
mise run format       # Prettier 整形
mise run lint         # 型チェック + ESLint
mise run check        # ローカル確認（format + lint）
mise run ci           # CI チェック（lint + build）
```

## 開発規約

コードスタイル、ディレクトリ構造、セキュリティガイドラインは以下を参照してください：

- `.claude/rules/code-style.md` - コードスタイルと開発規約
- `.claude/rules/tech-stack.md` - 技術スタック詳細
- `.claude/rules/security.md` - セキュリティガイドライン
- `.claude/rules/dotenvx.md` - dotenvx 暗号化管理ガイド

## 環境変数設定

dotenvx による暗号化管理:

- `.env` - 暗号化済み（コミット対象）
- `.env.keys` - 秘密鍵（**絶対にコミットしない**）
- `.env.example` - テンプレート

認証情報の取得先:

- **Clerk**: https://dashboard.clerk.com/
- **Supabase**: https://supabase.com/dashboard
  - Transaction Mode (Port 6543) の接続文字列を使用
  - `?pgbouncer=true` パラメータを追加

詳細は `.claude/rules/dotenvx.md` および `.claude/rules/security.md` を参照してください。

## 次のステップ

1. Clerk と Supabase プロジェクトを作成
2. `.env` に実際の認証情報を設定
3. `pnpm env:encrypt` で環境変数を暗号化（推奨）
4. `pnpm db:generate` で Prisma Client を生成
5. 開発サーバー起動
   - 暗号化した場合: `pnpm env:run -- pnpm dev`
   - 暗号化していない場合: `pnpm dev`
6. `/sign-in` でサインイン確認
