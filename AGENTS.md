# KeepOn Project Configuration

## プロジェクト概要

KeepOn は、Next.js 16 + Cloudflare Workers (D1) + Drizzle ORM + Cloudflare Access で構築された習慣トラッキング PWA です。

## コンテキスト参照

詳細な情報は以下を参照してください:

### プロダクト・構成

- `README.md` - プロダクト機能、セットアップ、アーキテクチャ、コマンド一覧

### Rules (詳細な開発規約)

- `.claude/rules/code-style.md` - コードスタイルと開発規約
- `.claude/rules/directory-structure.md` - 層構造と責務（schemas / validators / queries / actions）
- `.claude/rules/tech-stack.md` - 技術スタックと Workers の制約
- `.claude/rules/security.md` - セキュリティガイドライン
- `.claude/rules/dotenvx.md` - dotenvx 暗号化管理ガイド
- `.claude/rules/testing.md` - テストユーザー管理・E2E ガイド
- `.claude/rules/debugging.md` - フロントエンドデバッグ（iOS PWA の Simulator 検証を含む）
- `.claude/rules/troubleshooting.md` - トラブルシューティング
- `.claude/rules/cloudflare-deployment.md` - Cloudflare デプロイガイド

### タスク管理

- `todo.txt` - 未解決事項（対象・検証条件・起票日つき。完了後は `done.txt` へ archive）
- `plans/README.md` - コード監査由来の実装計画と実行状況

## 重要な開発ルール

### コンポーネント使用規約

- `src/components/ui/` 配下の shadcn/ui コンポーネントは直接編集しない
- カスタマイズが必要な場合は `src/components/` 直下（または `basics/`）にラッパーを作成
- 通常の text 系フォーム入力には `@/components/basics/Input` を使用（パスワードマネージャー対応済み）。hidden / time など native の特殊 input は対象外

### 環境変数管理

- dotenvx で暗号化管理（`.env` はコミット可、`.env.keys` は**絶対にコミット禁止**）
- コマンド実行時は `pnpm env:run --` または `dotenvx run --` を使用
- 詳細は `.claude/rules/dotenvx.md` を参照

### 依存関係の更新

- pnpm の 24 時間リリースゲート（`minimumReleaseAge`、strict）が有効。未成熟なバージョンは install が hard fail する
- **`minimumReleaseAgeExclude` への追記でゲートを貫通させない**（過去に radix の壊れリリース混入でビルド全滅した経路）。成熟済みの最新版へ差し替えるか、24 時間待つ
- pnpm 本体のバンプは依存更新と分離した独立コミットにする

### 検証ゲート

- 作業中: touched file の format と関連テスト
- push 前（pre-push フックで自動実行）: `lint:types` → `test:types` → `test:e2e:types` → `lint:biome` → `test:ci` → `test:storybook:ci` → `build:ci`
- ローカル一括: `mise run check`（format + lint 系）、`mise run ci`（CI 相当）

### 開発開始手順

1. 環境変数を復号化: `pnpm dotenvx decrypt`
2. 編集後に再暗号化: `pnpm env:encrypt`
3. スキーマ同期: `pnpm db:generate` のあと `pnpm db:migrate:local`
4. 開発サーバー起動: `pnpm env:run -- pnpm dev`

## デバッグ

### iOS PWA（safe-area / standalone 表示）の検証

`env(safe-area-inset-*)` はデスクトップブラウザでは常に 0 のため、iOS 固有の表示は Chrome では検証できない。iPhone 実機がなくても **Xcode Simulator（実 WebKit）** で検証できる。手順の詳細は `.claude/rules/debugging.md` の「iOS Simulator での PWA 検証」を参照。

要点:

- Simulator の Safari で本番 URL を開き、共有 →「ホーム画面に追加」で standalone 起動
- macOS Safari の開発メニュー → シミュレータ →「ホーム画面のWebアプリ」で Web Inspector 接続（standalone と Safari タブを取り違えないこと）
- スクリーンショットは `xcrun simctl io <udid> screenshot`（ウィンドウ座標に依存しないため安全）

### 既知の落とし穴

- `html` に背景色を塗っても `body { @apply bg-background }` が上に重なる。iOS standalone の下端を塗る場合は `html` と `body` の両方に設定する（`StreakDashboard.tsx` の useEffect が実例）
- `overflow-hidden` の祖先内で `backdrop-filter` を使うと iOS Safari が背景を不透明に塗る
- `position: fixed; inset: 0` は initial containing block までしか覆えず、safe-area の外側には届かない

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
