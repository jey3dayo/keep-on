# KeepOn

[![Deploy to Cloudflare Workers](https://github.com/jey3dayo/keep-on/actions/workflows/deploy.yml/badge.svg)](https://github.com/jey3dayo/keep-on/actions/workflows/deploy.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-0E0E0E)](https://orm.drizzle.team/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)

ストリーク/習慣トラッキングの PWA アプリ

## 概要

KeepOn は、習慣形成をサポートするモダンな Web アプリケーションです。

## 主な特徴

- 🚀 **Edge Computing**: Cloudflare Workers で高速・低レイテンシ
- 🔒 **セキュア**: dotenvx 暗号化 + Clerk v7 認証 + セキュリティヘッダー
- 🤖 **完全自動化**: Infrastructure as Code + GitHub Actions CI/CD
- 🎨 **モダンUI**: Radix Colors + ダークモード対応
- 📱 **PWA**: プログレッシブ Web アプリ（インストール対応）
- ✅ **チェックイン**: 習慣の記録と楽観的更新による即時フィードバック
- 🔥 **ストリーク**: 連続記録日数の追跡
- 📅 **カレンダーヒートマップ**: 達成状況の視覚化
- 📊 **アナリティクス**: 総チェックイン数などの統計ダッシュボード
- ⚙️ **設定**: タイムゾーン・テーマなどのユーザー設定
- 📦 **アーカイブ/スキップ**: 習慣の一時休止・スキップ対応
- 🛡️ **エラー監視**: Sentry 統合（Cloudflare Workers 向け）

## 技術スタック

- フロントエンド: Next.js 16 (App Router, Turbopack)
- デプロイ: Cloudflare Workers (OpenNext)
- 認証: Clerk v7
- DB: Cloudflare D1 (SQLite)
- ORM: Drizzle ORM + drizzle-kit
- バリデーション: Valibot
- エラーハンドリング: byethrow (Result 型) + error-factory
- 環境変数: dotenvx
- リンター/フォーマッター: Biome (Ultracite)
- テスト: Vitest + React Testing Library
- E2E テスト: Playwright
- コンポーネント開発: Storybook
- エラー監視: Sentry (Cloudflare Workers)
- PWA: manifest.json + PWA アイコン一式

## 本番環境

- URL: https://keep-on.jey3dayo.net
- Workers URL: https://keep-on.j138cm.workers.dev
- デプロイ: GitHub Actions (main ブランチへのプッシュで自動デプロイ)

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

- Clerk: https://dashboard.clerk.com/

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

### ユニットテスト（Vitest）

```bash
pnpm test              # watch モードでテスト実行
pnpm test:run          # 1回だけテスト実行
pnpm test:ui           # UI モードでテスト実行
pnpm test:coverage     # カバレッジ付きテスト実行
```

### E2E テスト（Playwright）

```bash
pnpm test:e2e          # E2E テスト実行
pnpm test:e2e:ui       # UI モードで E2E テスト実行
pnpm test:e2e:setup    # 認証状態を生成
```

### Storybook テスト

```bash
pnpm test:storybook         # Storybook インタラクションテスト
pnpm test:storybook:browser # ブラウザでのスモークテスト
```

## コマンド

```bash
# 開発
pnpm dev              # 開発サーバー起動（Turbopack）
pnpm storybook        # Storybook 起動

# テスト
pnpm test             # テスト実行（watch モード）
pnpm test:ui          # UI モードでテスト実行
pnpm test:run         # テスト実行（1回のみ）
pnpm test:coverage    # カバレッジ付きテスト実行
pnpm test:e2e         # E2E テスト実行
pnpm test:e2e:ui      # UI モードで E2E テスト実行

# コード品質
pnpm format           # Biome で整形
pnpm lint             # Biome でチェック

# データベース
pnpm db:generate      # Drizzle マイグレーション生成
pnpm db:push          # スキーマ同期（dev用）
pnpm db:migrate       # マイグレーション適用
pnpm db:studio        # Drizzle Studio 起動

# Cloudflare
pnpm build:cf         # OpenNext ビルド
pnpm cf:deploy        # Cloudflare デプロイ
pnpm cf:preview       # ローカルプレビュー
pnpm cf:logs          # ログ確認
pnpm cf:metrics       # Workers メトリクス取得
pnpm deploy           # build:cf + cf:deploy

# mise タスク
mise run format       # Biome 整形 + Taplo + Markdownlint
mise run lint         # 型チェック + Biome + Markdown + YAML
mise run check        # ローカル確認（format + lint）
mise run check:quick  # クイックチェック（型 + Biome）
mise run ci           # CI チェック（型 + Biome + Test + Build）
mise run deploy       # Cloudflare デプロイ
mise run deploy:preview # ローカルプレビュー
```

## ディレクトリ構造

```text
keep-on/
├── .claude/          # Claude Code 設定・ルール
├── .kiro/            # Kiro steering ドキュメント
├── assets/           # 元画像（ロゴなど）
├── drizzle.config.ts # Drizzle Kit 設定
├── e2e/              # Playwright E2E テスト
├── public/           # 静的アセット・PWA アイコン
├── src/
│   ├── app/          # Next.js App Router
│   │   ├── (dashboard)/ # 認証済みルート（dashboard, habits, analytics, settings）
│   │   ├── actions/  # Server Actions
│   │   ├── sign-in/  # Clerk サインイン
│   │   └── sign-up/  # Clerk サインアップ
│   ├── components/   # 共有コンポーネント（shadcn/ui ラッパー含む）
│   ├── constants/    # 定数定義
│   ├── contexts/     # React Context（SyncContext など）
│   ├── db/           # Drizzle スキーマ/接続
│   ├── hooks/        # カスタム React フック
│   ├── lib/          # ユーティリティ（cache, sentry など）
│   ├── schemas/      # Valibot スキーマ定義
│   ├── transforms/   # データ変換ロジック
│   ├── types/        # TypeScript 型定義
│   └── validators/   # バリデーションロジック
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
./scripts/setup-cloudflare-secrets-bulk.sh
```

#### CI/CD 自動デプロイ

GitHub Secrets に以下を設定後、`main` ブランチへのプッシュで自動デプロイ：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DOTENV_PRIVATE_KEY`

詳細は `.claude/rules/cloudflare-deployment.md` を参照。

---

## 注意事項

- Drizzle ORM: drizzle-kit でマイグレーション管理
- Cloudflare Workers: バンドルサイズ 25MB gzipped 制限に注意
- dotenvx: 本番運用時は `.env` を暗号化してコミット

## トラブルシューティング

トラブルシューティングは `.claude/rules/troubleshooting.md` に移動しました。

## 開発の進捗

### ✅ 完了

- [x] プロジェクト初期セットアップ
- [x] Next.js 16 + Drizzle + Wrangler 4 へのアップグレード
- [x] Clerk v7 認証統合
- [x] Cloudflare D1 データベース接続
- [x] Drizzle マイグレーション
- [x] Infrastructure as Code 完全自動化（wrangler.jsonc, GitHub Actions, Secrets管理）
- [x] Cloudflare Workers デプロイ（カスタムドメイン: keep-on.jey3dayo.net）
- [x] デザインシステム導入（Radix Colors + ダークモード）
- [x] チェックイン機能（楽観的更新・キュー制御・ロールバック対応）
- [x] カレンダーヒートマップ（達成状況の視覚化）
- [x] ストリーク表示（連続記録日数）
- [x] アナリティクスダッシュボード（総チェックイン数などの統計）
- [x] 習慣のアーカイブ/スキップ機能
- [x] 設定ページ（タイムゾーン・テーマ設定）
- [x] Sentry 統合（Cloudflare Workers 向けエラー監視）
- [x] セキュリティヘッダー設定
- [x] PWA アイコン一式（192x192, 512x512, Maskable, Apple Touch Icon）
- [x] Cloudflare KV キャッシュ（習慣・アナリティクス）
- [x] Valibot 導入（型安全なバリデーション）
- [x] Biome (Ultracite) 導入（リンター/フォーマッター）
- [x] Storybook 導入（コンポーネント開発）
- [x] Playwright E2E テスト導入
- [x] PRプレビュー環境（自動デプロイ）

### 🔄 次のステップ

1. PWA 最適化
   - [ ] オフライン対応（Service Worker）
   - [ ] プッシュ通知

2. 機能拡張
   - [ ] 習慣のカテゴリ/タグ管理
   - [ ] 目標設定・リマインダー

3. パフォーマンス
   - [ ] レート制限実装
   - [ ] Cloudflare API トークンローテーション自動化

## ライセンス

MIT
