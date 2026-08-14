# Implementation Plans

improve スキルによる監査計画の索引。

- 2026-08-10（`HEAD = 88f423b`）: plans 001–006（いずれも **DONE**・main に取り込み済み）
- 2026-08-13（`HEAD = d5df968`）: plans 007–013（007–010 **DONE**、011–013 **TODO**）
- 2026-08-14（`HEAD = 0f714c1`）: plans 014–019（本ラウンド・おすすめ + 軽微）

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
| 007  | habit mutation の dateKey/TZ/archived ゲート強化                                  | P1       | M      | —          | DONE   |
| 008  | オフライン enqueue の userId 欠落時 reject                                        | P1       | S      | —          | DONE   |
| 009  | docs ドリフト修正と @typescript/native 削除                                       | P1       | S      | —          | DONE   |
| 010  | calendar query の userId スコープ化                                               | P1       | S      | —          | DONE   |
| 011  | checkin/skip/reset/create の Action 層テスト                                      | P1       | M      | 007 推奨   | TODO   |
| 012  | IndexedDB offline-queue 直接テスト                                                | P2       | M      | —          | TODO   |
| 013  | analytics の checkin 重複読取統合                                                 | P2       | M      | —          | TODO   |
| 014  | online 時の /api/me 失敗で stale identity を復元しない                            | P1       | S      | —          | TODO   |
| 015  | SW のユーザー HTML cache fallback 廃止と sign-out purge 強化                      | P1       | M      | —          | TODO   |
| 016  | habit 所有権エラーのクライアント応答を統一                                        | P1       | S      | —          | TODO   |
| 017  | /habits 一覧で progress 取得をやめる                                              | P1       | S      | —          | TODO   |
| 018  | weekStart 時の habits KV 無効化と habit 経路の revalidatePath 拡張                | P1       | S      | —          | TODO   |
| 019  | user KV の schema 検証と cache hit 時 email reconcile                             | P2       | S      | —          | TODO   |

006 の quarantine 残は `todo.txt` の先頭項目を参照。

検証ゲート（実行時）: `pnpm exec biome check --write <touched>` → `pnpm exec tsc --noEmit` → 計画指定の `pnpm test:run -- …`。
テストファイルの型は `pnpm test:types`（`tsconfig.test.json`）。`mise run lint:types` は本番ソースのみ。

## Dependency notes

- **007 → 011**: 011 は 007 のゲート（dateKey 窓・archived）を断言できると強い。007 未適用なら現行 authz のみでよい。
- **008 / 009 / 010 / 012 / 013** はファイル集合が概ね独立 → 並列可。
- **007** は `DashboardWrapper` / actions を触る。008 は hooks のみなので 007 と並列可。
- **014 / 015**: 端末上のユーザー境界（identity vs SW cache）。コード依存なし → 並列可。概念的には両方入れると共有端末リスクが揃う。
- **016 / 017 / 018 / 019**: 互いに独立 → 並列可。
- **018** の `revalidatePath` 拡張は 017 とファイル衝突なし。
- **011–013**（前回残）と **014–019** も概ね独立。011 と 016 はどちらも `actions/habits` を触りうるので同時実行時は注意。

### ファイル集合（衝突確認用・014+）

- **014**: `IdentityContext.tsx`, `identity-cache-policy.ts`(+test)
- **015**: `public/sw.js`, `constants/pwa.ts`, `clear-user-caches.ts`(+test), `SiteHeader.tsx`, `ServiceWorkerRegistration.tsx`
- **016**: `actions/habits/{utils,checkin-shared,reset}.ts`, habit action tests, 必要なら `serializable` / error 定数
- **017**: `HabitTable.tsx`, 必要なら `habits/page.tsx` / `HabitTableClient.tsx`
- **018**: `user-settings.ts`, `updateUserSettings.ts`, `actions/habits/utils.ts`, settings/habit action tests
- **019**: `user-cache.ts`, `user.ts`, `lib/__tests__/user.test.ts`

## 2026-08-14 で計画化した検出

推奨 1–5 → **014**（identity online guard）, **015**（SW cache isolation）, **016**（ownership error unify）, **017**（habits list overfetch）, **018**（weekStart invalidate + path revalidate; finding 5+6 統合）。
軽微 → **019**（user KV validate + email reconcile; finding 7+9 統合）。

未計画（意図的）: `/api/checkin` route テスト（TEST-08, M）, CI での Playwright 実行（DX-10, M）, direction（reminder push / offline skip / Access E2E / rate limit）。

## Findings considered and rejected / closed since prior audit

- 本番 debug ページ負荷 — `IS_CONCURRENCY_DEBUG_ENABLED = NODE_ENV !== 'production'` で無効化済み
- Playwright の dotenvx 鍵のコマンド埋め込み — `webServer.env` へ移行済み
- `logging.ts` CJS `require` — 解消済み
- E2E spec 0 件 — ナビ smoke は追加済み。書込パス未ゲートは TEST として残すが 011/012 が優先
- `noJsxPropsBind` / optimistic `pendingCount` / cache versioning / preview 共有 D1 / dotenvx `.env` — 前回どおり by-design
- updateUserSettings 競合・dashboard client remount — `todo.txt` バックログのまま（本ラウンド外）
- `/health` 詳細公開 — Playwright 死活向けの意図的公開寄り。優先度低のため未計画
- `deleteLatestCheckin` count-then-act — 低頻度レース・MED confidence。見送り
- offline checkin batch API — 契約設計が大きく今回外
- `habit-read` 分割 / HabitTable の loader 切り出し — 017 の後で十分
- Storybook `image-size` high — dev のみ・本番未到達。今はやらない
- Prisma→Drizzle 古い migration doc — 影響小。docs 掃除時でよい
