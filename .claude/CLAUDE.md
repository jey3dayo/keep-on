# KeepOn Project Configuration

## プロジェクト概要

KeepOn は、Next.js 15 + Cloudflare Workers + Drizzle ORM + Supabase + Clerk で構築された PWA アプリケーションです。

## コンテキスト参照

詳細な情報は以下を参照してください:

**Steering (プロジェクト全体の知識)**:

- `.kiro/steering/tech.md` - 技術スタック・開発ツール・コマンド一覧
- `.kiro/steering/product.md` - プロダクト仕様
- `.kiro/steering/structure.md` - ディレクトリ構造

**Rules (開発規約)**:

- `.claude/rules/code-style.md` - コードスタイルと開発規約
- `.claude/rules/security.md` - セキュリティガイドライン
- `.claude/rules/dotenvx.md` - dotenvx 暗号化管理ガイド
- `.claude/rules/testing.md` - テストユーザー管理ガイド
- `.claude/rules/troubleshooting.md` - トラブルシューティング
- `.claude/rules/cloudflare-deployment.md` - Cloudflare デプロイガイド

## 重要な開発ルール

### コンポーネント使用規約

- `src/components/ui/` 配下のshadcn/uiコンポーネントは直接編集しない
- カスタマイズが必要な場合は `src/components/` 直下にラッパーを作成
- フォーム入力には `@/components/Input` を使用（パスワードマネージャー対応済み）

### 環境変数管理

- dotenvx で暗号化管理（`.env` はコミット可、`.env.keys` は**絶対にコミット禁止**）
- コマンド実行時は `pnpm env:run --` または `dotenvx run --` を使用
- 詳細は `.claude/rules/dotenvx.md` を参照

### 開発開始手順

1. 環境変数を復号化: `pnpm dotenvx decrypt`
2. 編集後に再暗号化: `pnpm env:encrypt`
3. スキーマ同期: `pnpm db:push`
4. 開発サーバー起動: `pnpm env:run -- pnpm dev`
