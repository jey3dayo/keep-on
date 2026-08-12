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

### オフラインキューの userId スコープ化（バックログ）

- 対象: `public/sw.js` / `src/lib/pwa/offline-queue.ts` のチェックインキュー。キューアイテムに userId が無く、replay 時の本人照合ができない
- 現状の防御はサインアウト・ユーザー交代検知時の `CLEAR_USER_CACHE` によるクリアのみ。前ユーザーがサインアウト検知されないままタブを閉じ、別ユーザーが新規タブでログインした場合はキューが残る
- 対策: キューアイテムに userId を持たせ、replay 時に現セッションの userId と照合して不一致は破棄（IndexedDB スキーマ変更を伴う）
- 起票日: 2026-08-13（Sonnet 改善監査 finding 2 の残リスク）

### dashboard クライアント側の二重 mount / KV I/O の軽量再監査（バックログ）

- 対象: `DashboardWrapper.tsx` の useEffect / Strict Mode 二重発火と KV アクセスのトレース
- 2026-08-13 の改善監査では Server Component 側に問題なし、クライアント側は未追跡（confidence 低）のため単体で再監査する
- 起票日: 2026-08-13（Sonnet 改善監査 finding 6）

### TypeScript 7 / jsdom 30 への major 更新

- 対象: `typescript`（`^6.0.3` → `^7.0.2`）、`jsdom`（`^29.1.1` → `^30.0.1`）
- 理由: 2026-08-12 の依存一括更新で意図的に除外。このリポジトリには「TS7 は Next 16.2 非対応」で
  ビルドを壊した既往がある。Next は今回 16.3.0 に上がっており前提が変わった可能性があるため、
  Next 16.3 の TS7 対応状況を確認してから判断する。`package.json` に残る
  `@typescript/native`（`npm:typescript@^7.0.2`）が installed-but-unreferenced な点も併せて整理する
- 検証: `pnpm exec tsc --noEmit` と `pnpm test:run` が通ることに加え、Next のビルド（`pnpm build:cf`）が壊れないこと
- 起票日: 2026-08-12
