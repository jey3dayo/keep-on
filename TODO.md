# TODO

## テスト型チェックの quarantine（tsconfig.test.json）

`tsconfig.test.json` を新設し、テストファイルを型チェックの対象にした（plans/006）。
以下の 3 ファイルは `tsconfig.test.json` の `exclude` で個別に除外している。

- `src/lib/queries/__tests__/habit.test.ts`
- `src/lib/queries/__tests__/checkin.test.ts`
- `src/lib/queries/__tests__/user.test.ts`

### 理由

`vi.mock('@/lib/db')` が返す Drizzle fluent モックが、実際の `DrizzleD1Database` 型と
構造的に一致しないため型チェックが通らない（49 件）。型アサーションでモックを本物の DB 型に
偽装しても、Drizzle が実際に生成する SQL の正しさは一切強くならないため、アサーションでの
解消は行わない。

### 解除条件

各ファイルを実 SQLite ベースのテストへ移行したら、`tsconfig.test.json` の `exclude` から
該当行を削除する。手本は `src/lib/queries/__tests__/checkin-sql.test.ts` と
`src/lib/queries/__tests__/helpers/sqlite-d1.ts`。1 ファイル移行するごとに 1 行ずつ削除すること。

### 後続課題（解消済み）

- ~~`*.stories.tsx` は `tsconfig.test.json` の対象外のまま~~ → `tsconfig.test.json` の `include` に `src/**/*.stories.ts(x)` を追加済み
- ~~`tsconfig.e2e.json` を使う `pnpm test:e2e:types` は CI・pre-push いずれにも未接続~~ → `mise.toml` の `lint` / `ci` タスクと `lefthook.yml` の pre-push に接続済み

## 未解決事項

### 実機（iOS PWA）での視覚確認が未実施の変更

- 対象: 直近の safe-area / ヘッダー / サイドバー / ボタン統一まわりの UI 変更一式
- 追加対象（2026-08-13 デプロイ分）: ダッシュボード没入背景の共通化（下端の明るい帯の解消）、ヘッダーのロゴ光学サイズ・階層調整
- 検証: 実機の iOS PWA で目視確認（自動テストでは代替不可）
- 起票日: 2026-08-10

### updateUserSettings の並行実行競合（バックログ）

- 対象: `src/lib/queries/user-settings.ts` の Phase2 失敗時ロールバックが、並行する別呼び出しの正常な更新を古いスナップショットで上書きしうる（D1 トランザクション非対応が制約）
- 対策案: 楽観ロック用バージョンカラム、または同一ユーザーの設定更新のサーバー側直列化
- 発生条件が複合的（同一ユーザーの並行更新 + weekStart 更新失敗）で頻度は低い。優先度低
- 起票日: 2026-08-13（Sonnet 改善監査 finding 4）

### dashboard クライアント側の二重 mount / KV I/O の軽量再監査（バックログ）

- 対象: `DashboardWrapper.tsx` の useEffect / Strict Mode 二重発火と KV アクセスのトレース
- 2026-08-13 の改善監査では Server Component 側に問題なし、クライアント側は未追跡（confidence 低）のため単体で再監査する
- 起票日: 2026-08-13（Sonnet 改善監査 finding 6）

### TypeScript 7 / jsdom 30（更新済み）

- `typescript`（`^7.0.2`）と `jsdom`（`^30.0.1`）へ major 更新済み
- 未使用だった `@typescript/native`（`npm:typescript@^7.0.2`）は `typescript` と重複のため削除
- `@typescript/typescript6` は `scripts/lib/extract-jsdoc.ts` が TS6 API を参照するため devDependency として残す
- 起票日: 2026-08-12（2026-08-13 に majors 適用・native 整理）
