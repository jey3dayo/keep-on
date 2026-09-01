# Implementation Plans

improve スキルによる監査計画の索引。

- 2026-08-10（`HEAD = 88f423b`）: plans 001–006（いずれも **DONE**・main に取り込み済み）
- 2026-08-13（`HEAD = d5df968`）: plans 007–013（007–010 **DONE**、011–013 **TODO**）
- 2026-08-14（`HEAD = 0f714c1`）: plans 014–019（本ラウンド・おすすめ + 軽微）
- 2026-08-27（`HEAD = 5577aeb`）: plans 020–023（モーション監査・**すべて DONE**。2026-08-29 の reconcile でコード実装を確認: scale="none" 化 / globals.css の motion shim + `--ease-*` トークン / Drawer のイベント駆動遷移 + fallback timer / ThemeSettings の transition プロパティ限定）
- 2026-08-29（`HEAD = c74f61c`）: plans 024–028（モーション監査 第2ラウンド・すべて **TODO**）
- 2026-09-01（`HEAD = 23de1b4`）: plan 031（Linear JEY-636・SW キャッシュのビルドスコープ化）

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
| 014  | online 時の /api/me 失敗で stale identity を復元しない                            | P1       | S      | —          | DONE   |
| 015  | SW のユーザー HTML cache fallback 廃止と sign-out purge 強化                      | P1       | M      | —          | TODO   |
| 016  | habit 所有権エラーのクライアント応答を統一                                        | P1       | S      | —          | DONE   |
| 017  | /habits 一覧で progress 取得をやめる                                              | P1       | S      | —          | DONE   |
| 018  | weekStart 時の habits KV 無効化と habit 経路の revalidatePath 拡張                | P1       | S      | —          | TODO   |
| 019  | user KV の schema 検証と cache hit 時 email reconcile                             | P2       | S      | —          | TODO   |
| 020  | 高頻度チェックインの hover 拡大を外し、press / reduced-motion を整理              | P1       | S      | 021        | DONE   |
| 021  | Radix の overlay motion utility を復旧し、共有 easing を導入                      | P1       | M      | —          | DONE   |
| 022  | Vaul Drawer の終了イベント後に編集・詳細へ遷移                                    | P1       | S      | —          | DONE   |
| 023  | テーマ切替タブの transition-all を視覚プロパティへ限定                            | P2       | S      | 021        | DONE   |
| 024  | Tailwind のデフォルト transition 曲線をトークンに揃える                           | P1       | S      | —          | TODO   |
| 025  | dropdown の transform-origin を v4 構文に修正（トリガー起点で開く）               | P1       | S      | —          | TODO   |
| 026  | ページスナップ中のチェックインタップ喪失を修正、ドット retarget                   | P1       | S      | —          | TODO   |
| 027  | 進捗バーの transform 化とリング fill の切断解消                                   | P2       | M      | —          | TODO   |
| 028  | 押下フィードバックの snap 解消と縮小率 0.95 統一                                  | P2       | S      | 024 推奨   | TODO   |
| 031  | SW キャッシュをビルド単位にスコープ（JEY-636）                                    | P1       | S      | —          | TODO   |

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
- **021 → 020 / 023**: 020 と 023 は共有 `ease-out` の強い曲線を前提にするため、021 を先に適用する。
- **020 / 021 / 022 / 023** は対象ファイルが重ならないため、021 完了後は並列可。ただし 022 のテストモック変更は `vitest.mocks.tsx` を共有する他の作業と直列化する。

### ファイル集合（衝突確認用・014+）

- **014**: `IdentityContext.tsx`, `identity-cache-policy.ts`(+test)
- **015**: `public/sw.js`, `constants/pwa.ts`, `clear-user-caches.ts`(+test), `SiteHeader.tsx`, `ServiceWorkerRegistration.tsx`
- **016**: `actions/habits/{utils,checkin-shared,reset}.ts`, habit action tests, 必要なら `serializable` / error 定数
- **017**: `HabitTable.tsx`, 必要なら `habits/page.tsx` / `HabitTableClient.tsx`
- **018**: `user-settings.ts`, `updateUserSettings.ts`, `actions/habits/utils.ts`, settings/habit action tests
- **019**: `user-cache.ts`, `user.ts`, `lib/__tests__/user.test.ts`
- **020**: `src/components/basics/Button.tsx`, `src/components/streak/HabitCircleItem.tsx`, `src/components/streak/HabitSimpleView.tsx`
- **021**: `src/app/globals.css`
- **022**: `src/components/dashboard/HabitActionDrawer.tsx`, `vitest.mocks.tsx`, `src/components/dashboard/HabitActionDrawer.test.tsx`
- **023**: `src/components/settings/ThemeSettings.tsx`

## 2026-08-29 animation audit notes（第2ラウンド, `HEAD = c74f61c`）

前回の 020–023 は実装済みを確認して DONE 化。今回は 8 カテゴリ横断監査（4 並列 subagent + 全指摘の親検証）。

- **実行順**: 024（1 行・全体の曲線が変わる）→ 025 / 026 / 027 並列可 → 028（024 の後だと `ease-out` 明示が既定と一致し差分の意味が明確）。
- **ファイル集合**: 024 = `globals.css` のみ / 025 = `ui/dropdown-menu.tsx` / 026 = `hooks/usePageSwipe.ts`(+test) / 027 = `ProgressRing.tsx`, `HabitListCard.tsx`, `analytics/page.tsx`, `ui/progress.tsx` / 028 = `HabitListCard.tsx`, `DashboardViewToggle.tsx`, `globals.css`。**027 と 028 は `HabitListCard.tsx` を共有、024 と 028 は `globals.css` を共有 → 直列化**。
- 計画化しなかった検出（次ラウンド候補・重要度順）:
  - `tailwind.config.ts:14-33` の `check-mark`（`scale(0)` 始まり）/ `progress-fill`（600ms）/ `pulse-ring` は **全て未使用**（grep 0 件）。config は `@config` で live なので削除が安全（latent violation の除去）。`ui/sheet.tsx:34` の inert な `duration-300/500`、`ui/drawer.tsx:22` の vaul 除外で死んでいる `animate-in` クラスも同種の掃除。
  - reduced-motion 全体安全網（`globals.css:648-657`）が `animate-spin` を初期フレームで凍結し、ローディング表示が「動かない静的アイコン」になる（`ui/sonner.tsx:24`, `HabitActionDialog.tsx:161`, `HabitUnarchiveButton.tsx:53`）。spin だけ穏やかな等価物（opacity pulse 等)へ差し替える例外が必要。
  - `CheckInIconSwap`（`HabitListCard.tsx:279-297`）の key リマウント + 単発 rAF は入場 transition をスキップし得る。`HabitCircleItem.tsx:131` と同じ `@starting-style`（`starting:`）へ寄せると堅い。
  - duration の未トークン化（150/160 の混在、`HabitCircleItem.tsx:166` のインライン overshoot bezier）、`ui/sidebar.tsx` の `ease-linear` + layout プロパティ transition（vendored・使用箇所は限定的）、`HabitCircleItem` 入場の 40ms stagger 未適用（機構は `COMPLETION_PULSE_STAGGER_MS` として同ファイルに既存）。
  - long-press の reduced-motion 代替（`globals.css:599-608`）が「あとどれだけ押すか」の情報を落とす。opacity ランプで duration 情報を残せる。
- Missed opportunities（追加系・監査所見のみ）: ① `HabitListView.tsx:296-305` の期間フィルタ pill がセグメント間をテレポートする（iOS セグメンテッドコントロールの意図なら共有 pill の translateX が本命）。② `総ストリーク`（`DashboardStatsCard`）の増分が生テキスト swap（1 日 1 回の高感情モーメント）。③ リストビューに入場モーションが無く円ビュー（`starting:`）と非対称。④ 空状態 → 初習慣作成が完全に無演出（once-per-user）。※「今日の進捗」カードは毎チェックインで変わるため animate 禁止（頻度ルール）。
- 却下 / by-design 確認済み: `ease-out` / `ease-in-out` ユーティリティは `@theme` 上書きで既に強いトークン曲線（弱い built-in ではない）。`ease-in` は 0 件。long-press の 500ms linear は hold 長で正当。usePageSwipe のラバーバンド・速度判定・reduced-motion 追従は正しい実装。ビュー切替の無アニメは頻度ルール上正しい。ProgressRing の 300–500ms は DESIGN.md 明記（027 は幅内での整合のみ）。vaul drawer は自前の velocity ドラッグで正しい。hover: は v4 が `(hover:hover)` でゲート済み。

## 2026-08-27 animation audit notes

監査対象は plain CSS / Tailwind CSS v4 / Radix UI / Vaul。KeepOn は「日常操作は静か、ストリーク完了だけ短く嬉しく」という crisp な製品トーンで、次を高確度の修正候補とした。

- `CheckInButton` の `scale="lg"` と `HabitCircleItem` の `scale="md"` は、`DESIGN.md` の「高頻度チェックインに hover 拡大を載せない」に反するため 020。
- Radix の `animate-in` 系クラスはソースにあるが、現行の生成 CSS に utility 実装がなく、Vaul 以外の popup/dialog/sheet motion が効いていないため 021。
- `HabitActionDrawer` の 350ms 固定待ちは、解決済み Vaul 1.1.2 の 500ms callback より短く、閉じ切る前に route push するため 022。
- `TabsTrigger` の `transition-all` は generated primitive を編集せず、利用側で color/background/shadow に限定するため 023。

意図的に計画化しなかったもの: `DESIGN.md:344` の進捗リング 300–500ms、`globals.css` の long-press linear fill、`checkin-icon-enter` の 160ms state swap、Vaul 自身の drawer motion、既存の reduced-motion 全体安全網。いずれも現行の設計意図・外部契約を確認済み。

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
