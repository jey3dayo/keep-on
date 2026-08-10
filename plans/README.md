# Implementation Plans

improve スキルによる監査（2026-08-10、`HEAD = 88f423b`）で作成。
各実行者は計画を最後まで読んでから着手し、STOP conditions を尊重し、
終わったら自分の行の Status を更新すること。

**共通ルール**: コミットはしない（作業ツリーに変更を残す）。
検証ゲートは `pnpm exec biome check --write src` → `pnpm tsc --noEmit` → `pnpm test:run`。

**注意**: リポジトリ直下の `.plans/`（ドット付き）は別ツールが生成した過去のタスクメモです。
この `plans/` とは無関係なので、そちらを更新・参照しないこと。

## Execution order & status

| Plan | Title                                                                             | Priority | Effort | Depends on | Status |
| ---- | --------------------------------------------------------------------------------- | -------- | ------ | ---------- | ------ |
| 001  | ユーザー設定の Server Action に実行時バリデーションを入れ、mass assignment を塞ぐ | P1       | S      | —          | DONE   |
| 002  | 公開ヘルスチェックページから Clerk 認証情報の断片を出さない                       | P1       | S      | —          | DONE   |
| 003  | ストリーク計算に特性テストを張る                                                  | P1       | M      | —          | DONE   |
| 004  | ダッシュボードのチェックイン取得を直近 1 年に制限する                             | P1       | M      | 003        | DONE   |
| 005  | チェックインの raw SQL を実 SQLite で検証するテストを追加する                     | P2       | M      | —          | DONE   |

Status はいずれも「実装完了・レビュー承認済み・**未コミット**」の意味。
全体ゲート（biome / tsc --noEmit / test:run / build:cf）は 2026-08-10 に通過済み。

## 実行時に判明した事項（次回の計画作成者へ）

- **`tsconfig.json:33-40` が `**/*.test.ts` を exclude している。**
  `mise run lint:types`（`tsc --noEmit`）はテストファイルを一度も型チェックしない。
  vitest も esbuild で型を剥がすだけなので、テストの型エラーは両ゲートを通過する。
  本作業中に実際 2 回、この穴がエラーを見逃した。
  計画書に「テストの型安全性は `tsc --noEmit` で検証」と書くと実行者を誤導するので、
  テストファイルの検証は vitest の実行結果と grep で指定すること。
- **`node:sqlite` による D1 シムは成立する**（005 で実証、新規依存ゼロ）。
  Drizzle の d1 ドライバが実際に呼ぶのは `prepare().bind().all()` と `.raw()` のみで、
  `first()` / `batch()` / `withSession()` / `dump()` は未実装 throw で足りる。
  ただし `D1PreparedStatement` のジェネリック `T` への変換に型アサーションが 1 箇所必要
  （`helpers/sqlite-d1.ts:96` に理由をコメント済み。外部システム境界の例外として許容）。

## Dependency notes

- **004 は 003 の完了が必須**。003 が `calculateStreakFromCheckins` に `export` を付け、
  現状の挙動を特性テストで固定する。004 はその安全網の上で取得範囲を絞る。
  両者は `src/lib/queries/habit-read.ts` を共有するため、**並列実行してはいけない**。
- 001 / 002 / 003 / 005 は編集ファイル集合が互いに素なので並列実行してよい。

### ファイル集合（衝突確認用）

| Plan | 触るファイル                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001  | `src/app/actions/settings/updateUserSettings.ts`, `src/lib/queries/user-settings.ts`, `src/app/actions/settings/__tests__/updateUserSettings.test.ts`(新), `src/lib/errors/settings.ts`(条件付き) |
| 002  | `src/app/health/page.tsx`                                                                                                                                                                         |
| 003  | `src/lib/queries/habit-read.ts`(export 1行のみ), `src/lib/queries/__tests__/habit-read.test.ts`(新)                                                                                               |
| 004  | `src/lib/queries/habit-read.ts`, `src/lib/queries/__tests__/habit-read.test.ts`(追記のみ)                                                                                                         |
| 005  | `src/lib/queries/__tests__/checkin-sql.test.ts`(新), `src/lib/queries/__tests__/helpers/sqlite-d1.ts`(新)                                                                                         |

## 今回計画化しなかった検出事項

監査では計 10 件を検出し、上位 5 件を計画化した。残りは未着手（再監査不要、内容は把握済み）:

- **本番同梱のデバッグページ**: `src/app/debug/repro-concurrency/` は認証さえ通れば
  1 リクエストで Clerk API + D1 を最大 30×5 回駆動できる。削除か認可強化が必要（S）。
- **Playwright が dotenvx 秘密鍵をシェルコマンド文字列に埋め込む**: `playwright.config.ts:96-98`。
  `webServer.env` へ移せば解決（S、ローカル開発のみの影響）。
- **`src/lib/logging.ts:41` の CJS `require()`**: 「循環依存回避」とコメントされているが
  `src/schemas/db.ts` は logging を import しておらず循環は存在しない。静的 import にできる（S）。
- **E2E の spec が 0 件**: `e2e/` に `auth.setup.cjs` しかなく、`pnpm test:e2e` は
  認証状態を作るだけ。ログイン→チェックイン→リロードの 1 本が費用対効果最大（M）。
- **`.kiro/steering/product.md` のドキュメントドリフト**: カレンダービューを
  「将来実装予定」と書いているが `HabitCalendarHeatmap.tsx` で実装済み。
  skip 機能（`HabitSkip` テーブル）は記載自体が無い（S）。

## Findings considered and rejected

再監査を避けるための記録。いずれもリポジトリ内に判断の記録があり、設計上の決定事項:

- `lint/performance/noJsxPropsBind` の 113 箇所 — `TODO.md` に分析と延期理由が記録済み。
- `DashboardWrapper` の `pendingCount <= 1` 確定ガード / `useOptimistic` 不採用 —
  `.claude/rules/optimistic-updates.md` §7 に、連打時のフリッカー対策としての設計意図あり。
- habit cache の `staleAt` / `dateKey` バージョニング — `.claude/rules/caching-strategy.md` に設計として記載。
- preview 環境が本番 D1 を共有 — `.claude/rules/cloudflare-deployment.md` に警告付きで明記済み。
- `.env` のコミット — dotenvx 前提。6 値すべて `encrypted:` で、`.env.keys` は gitignore 済みを確認。
- Clerk の headless リダイレクトループ — `.claude/rules/troubleshooting.md` で無視可と判断済み。
