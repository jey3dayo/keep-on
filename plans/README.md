# Implementation Plans

improve スキルによる監査計画の索引。

- 2026-08-10（`HEAD = 88f423b`）: plans 001–006（いずれも **DONE**・main に取り込み済み）
- 2026-08-13（`HEAD = d5df968`）: plans 007–013（本ラウンド）

各実行者は計画を最後まで読んでから着手し、STOP conditions を尊重すること。
**コミットは worktree 内のみ。ユーザーブランチへの merge / push はしない。**
`plans/README.md` の Status 更新は、improve execute 経由なら **reviewer（advisor）が行う**。

**注意**: リポジトリ直下の `.plans/`（ドット付き）は別ツールの過去メモ。この `plans/` とは無関係。

## Execution order & status

| Plan | Title                                                                             | Priority | Effort | Depends on | Status |
| ---- | --------------------------------------------------------------------------------- | -------- | ------ | ---------- | ------ |
| 001  | ユーザー設定の Server Action に実行時バリデーションを入れ、mass assignment を塞ぐ | P1       | S      | —          | DONE   |
| 002  | 公開ヘルスチェックページから Clerk 認証情報の断片を出さない                       | P1       | S      | —          | DONE   |
| 003  | ストリーク計算に特性テストを張る                                                  | P1       | M      | —          | DONE   |
| 004  | ダッシュボードのチェックイン取得を直近 1 年に制限する                             | P1       | M      | 003        | DONE   |
| 005  | チェックインの raw SQL を実 SQLite で検証するテストを追加する                     | P2       | M      | —          | DONE   |
| 006  | テストファイルを型チェック対象にし型契約バグを修正                                | P1       | M      | —          | DONE   |
| 007  | habit mutation の dateKey/TZ/archived ゲート強化                                  | P1       | M      | —          | IN REVIEW（対応済み） |
| 008  | オフライン enqueue の userId 欠落時 reject                                        | P1       | S      | —          | DONE（reviewer LGTM） |
| 009  | docs ドリフト修正と @typescript/native 削除                                       | P1       | S      | —          | IN REVIEW（対応済み） |
| 010  | calendar query の userId スコープ化                                               | P1       | S      | —          | IN REVIEW（対応済み） |
| 011  | checkin/skip/reset/create の Action 層テスト                                      | P1       | M      | 007 推奨   | TODO   |
| 012  | IndexedDB offline-queue 直接テスト                                                | P2       | M      | —          | TODO   |
| 013  | analytics の checkin 重複読取統合                                                 | P2       | M      | —          | TODO   |

006 の quarantine 残は `TODO.md` を参照。

検証ゲート（実行時）: `pnpm exec biome check --write <touched>` → `pnpm exec tsc --noEmit` → 計画指定の `pnpm test:run -- …`。
テストファイルの型は `pnpm test:types`（`tsconfig.test.json`）。`mise run lint:types` は本番ソースのみ。

## Dependency notes

- **007 → 011**: 011 は 007 のゲート（dateKey 窓・archived）を断言できると強い。007 未適用なら現行 authz のみでよい。
- **008 / 009 / 010 / 012 / 013** はファイル集合が概ね独立 → 並列可。
- **007** は `DashboardWrapper` / actions を触る。008 は hooks のみなので 007 と並列可。

### ファイル集合（衝突確認用・007+）

- **007**: `validators/habit-action.ts`, `actions/habits/{checkin-shared,skip,reset,checkin,remove-checkin}.ts`, `DashboardWrapper.tsx`, action tests
- **008**: `hooks/useOfflineCheckin.ts`, `hooks/useOfflineCheckin.test.ts`
- **009**: `AGENTS.md`, `.claude/rules/*`, `product.md`, `README.md`, `plans/README.md`, `DESIGN_REVIEW.md`, `TODO.md`, `package.json`（native 削除）
- **010**: `habit-calendar.ts`, `habits/[id]/page.tsx`, `habit-read.ts`, `dashboard/page.tsx`, `HabitTable.tsx`
- **011**: `actions/habits/__tests__/*`（新規）
- **012**: `lib/pwa/__tests__/offline-queue.test.ts`（+ 条件付き fake-indexeddb）
- **013**: `analytics/page.tsx`, 必要なら queries 集計ヘルパ

## 2026-08-13 で計画化した検出（todo.txt `+improve` と対応）

推奨セット 1–5 → 007（1–3 統合）, 008（4）, 009（5+docs/deps）。残り → 010–013。

## Findings considered and rejected / closed since prior audit

- 本番 debug ページ負荷 — `IS_CONCURRENCY_DEBUG_ENABLED = NODE_ENV !== 'production'` で無効化済み
- Playwright の dotenvx 鍵のコマンド埋め込み — `webServer.env` へ移行済み
- `logging.ts` CJS `require` — 解消済み
- E2E spec 0 件 — ナビ smoke は追加済み。書込パス未ゲートは TEST として残すが 011/012 が優先
- `noJsxPropsBind` / optimistic `pendingCount` / cache versioning / preview 共有 D1 / dotenvx `.env` — 前回どおり by-design
- updateUserSettings 競合・dashboard client remount — `TODO.md` / todo.txt バックログのまま（本ラウンド外）
