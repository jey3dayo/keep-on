# KeepOn

習慣トラッキング PWA。Next.js 16 + Cloudflare Workers (D1) + Drizzle ORM + Cloudflare Access。

プロダクト機能・セットアップ・コマンド一覧は `README.md`、層構造やドメインごとの詳細規約は `.claude/rules/*.md`（`code-style` / `directory-structure` / `tech-stack` / `security` / `dotenvx` / `testing` / `debugging` / `troubleshooting` / `cloudflare-deployment` など）にある。必要になった時点で該当ファイルを読む。

未解決事項は `todo.txt`（完了後 `done.txt` へ archive）、監査由来の実装計画は `plans/README.md`。

## 踏むと痛い落とし穴

コードを読めば分かることは書かない。以下は読んでも分からず、外すと壊れるもの。

- **`.env.keys` は絶対にコミットしない**（`.env` は dotenvx で暗号化済みなのでコミット可）。コマンドは `pnpm env:run --` 経由で実行する
- **pnpm の 24 時間リリースゲート（`minimumReleaseAge`, strict）を `minimumReleaseAgeExclude` で貫通させない**。過去に radix の壊れリリースが混入してビルドが全滅した。成熟済みの最新版へ差し替えるか 24 時間待つ。pnpm 本体のバンプは独立コミットにする
- **`src/components/ui/`（shadcn/ui）は直接編集しない**。カスタマイズは `src/components/` 直下か `basics/` にラッパーを作る。text 系フォーム入力は `@/components/basics/Input`（パスワードマネージャー対応済み。hidden / time など native 特殊 input は対象外）
- **iOS standalone の表示は Chrome では検証できない**（`env(safe-area-inset-*)` が常に 0）。Xcode Simulator の実 WebKit で検証する。手順と既知の CSS 罠（`html`/`body` 両方に背景、`overflow-hidden` 内の `backdrop-filter`、`position: fixed` と safe-area）は `.claude/rules/debugging.md`

## 検証ゲート

作業中は touched file の format と関連テストのみ。push 前は pre-push フックが `lint:types` → `test:types` → `test:e2e:types` → `lint:biome` → `test:ci` → `test:storybook:ci` → `build:ci` を自動実行する。手動で回すなら `mise run check`（format + lint）/ `mise run ci`（CI 相当）。

## 開発開始

`README.md` の「セットアップ」に従う（依存 → 環境変数 → スキーマ同期 → `pnpm env:run -- pnpm dev`）。コマンド一覧も README が正本。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
