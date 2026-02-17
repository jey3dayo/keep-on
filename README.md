# KeepOn

[![Deploy to Cloudflare Workers](https://github.com/jey3dayo/keep-on/actions/workflows/deploy.yml/badge.svg)](https://github.com/jey3dayo/keep-on/actions/workflows/deploy.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-0E0E0E)](https://orm.drizzle.team/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)

ストリーク/習慣トラッキングの PWA アプリ（MVP）

## 概要

KeepOn は、習慣形成をサポートするモダンな Web アプリケーションです。

### 主な特徴:

- 🚀 **Edge Computing**: Cloudflare Workers で高速・低レイテンシ
- 🔒 **セキュア**: dotenvx 暗号化 + Clerk 認証
- 🤖 **完全自動化**: Infrastructure as Code + GitHub Actions CI/CD
- 🎨 **モダンUI**: Radix Colors + ダークモード対応
- 📱 **PWA**: オフライン対応可能なプログレッシブ Web アプリ

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router, Turbopack)
- **デプロイ**: Cloudflare Workers (OpenNext)
- **認証**: Clerk
- **DB**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM + drizzle-kit
- **環境変数**: dotenvx
- **テスト**: Vitest + React Testing Library
- **PWA**: manifest.json

## 本番環境

- **URL**: https://keep-on.j138cm.workers.dev
- **デプロイ**: GitHub Actions (main ブランチへのプッシュで自動デプロイ)

## 最近のアップデート

### 2026-01-25 - Prisma → Drizzle 移行完了

### 主な変更:

- 🔁 **Prisma → Drizzle**: ORM を Drizzle ORM + drizzle-kit に移行
- 🧹 **Prisma 関連削除**: 依存/スキーマ/生成物を削除
- 🧩 **DB コマンド更新**: db:\* を Drizzle ベースに整理

### v0.2.0 (2026-01-24) - メジャーアップグレード & IaC完全自動化

### 主要な変更:

- ⬆️ **Next.js 15 → 16**: Turbopack デフォルト化、Async Request APIs 対応
- ⬆️ **Wrangler 3 → 4**: Cloudflare Workers 最新ツール対応
- 🤖 **CI/CD 完全自動化**: GitHub Actions でゼロタッチデプロイ実現
- 📦 **Infrastructure as Code**: 設定ファイル・Secrets・デプロイスクリプト全てコード化
- 🔒 **セキュリティ強化**: dotenvx 暗号化管理、Secrets分離

### その他の更新:

- date-fns 4.1.0 追加
- lucide-react 0.563.0 更新
- @types/node 25 対応
- mise.toml にデプロイタスク追加

詳細は [PR #21](https://github.com/jey3dayo/keep-on/pull/21) を参照。

---

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

### 3. DB スキーマの同期（Drizzle）

```bash
pnpm db:generate   # マイグレーション生成
pnpm db:push       # dev用に同期
# 既存マイグレーションを適用する場合:
pnpm db:migrate
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
import { describe, it, expect } from "vitest";
import { myFunction } from "./utils";

describe("myFunction", () => {
  it("正しく動作する", () => {
    expect(myFunction()).toBe("expected");
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
pnpm db:generate      # Drizzle マイグレーション生成
pnpm db:push          # スキーマ同期（dev用）
pnpm db:migrate       # マイグレーション適用
pnpm db:studio        # Drizzle Studio起動

# Cloudflare
pnpm cf:build         # OpenNext ビルド
pnpm cf:deploy        # Cloudflare デプロイ
pnpm cf:preview       # ローカルプレビュー
pnpm cf:logs          # ログ確認
pnpm cf:metrics       # Workers メトリクス取得
pnpm cf:alerts        # アラート設定ガイド
pnpm deploy           # cf:build + cf:deploy

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
├── drizzle.config.ts # Drizzle Kit 設定
├── public/           # 静的アセット・PWA
├── src/
│   ├── app/          # Next.js App Router
│   ├── db/           # Drizzle スキーマ/接続
│   ├── lib/          # ユーティリティ
│   ├── components/   # 共有コンポーネント
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

- **Drizzle ORM**: drizzle-kit でマイグレーション管理
- **Cloudflare Workers**: バンドルサイズ 25MB gzipped 制限に注意
- **dotenvx**: 本番運用時は `.env` を暗号化してコミット

## トラブルシューティング

トラブルシューティングは `.claude/rules/troubleshooting.md` に移動しました。

## 開発の進捗

### ✅ 完了

- [x] プロジェクト初期セットアップ
- [x] Next.js 16 + Drizzle + Wrangler 4 へのアップグレード
- [x] Clerk 認証統合（開発環境）
- [x] Cloudflare D1 データベース接続
- [x] Drizzle マイグレーション（開発環境）
- [x] Infrastructure as Code 完全自動化
  - wrangler.jsonc: Workers 設定
  - GitHub Actions: CI/CD パイプライン
  - Secrets管理: スクリプト化
- [x] Cloudflare Workers デプロイ
- [x] 基本機能の実装
  - ユーザー認証フロー
  - 習慣作成機能
  - ダッシュボード表示
- [x] デザインシステム導入（Radix Colors + ダークモード）

### 🔄 次のステップ

1. 本番環境セットアップ
   - [ ] Drizzle マイグレーション実行（本番DB）
   - [ ] 本番環境動作確認
   - [ ] エラーモニタリング設定（Sentry/Cloudflare Analytics）

2. 機能拡張
   - [ ] チェックイン機能（習慣の記録）
   - [ ] 履歴表示（カレンダービュー）
   - [ ] ストリーク表示（連続記録日数）
   - [ ] 統計ダッシュボード

3. PWA 最適化
   - [ ] アプリアイコン作成（192x192, 512x512）
   - [ ] オフライン対応
   - [ ] プッシュ通知

4. セキュリティ強化
   - [ ] Cloudflare API トークンローテーション
   - [ ] セキュリティヘッダー設定
   - [ ] レート制限実装

## ライセンス

MIT
