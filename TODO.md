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

### 依存更新の再実行待ち

4 パッケージが pnpm の 24 時間リリースゲート（`minimum_release_age`）に掛かっており、
2026-08-11 01:02Z 以降に再実行が必要。

### `withDbRetry` のリトライ遅延の不整合

クライアント側は `RETRY_DELAY_MS`（250ms）待ってから再試行するのに対し、`src/lib/db-retry.ts`
の `withDbRetry` はデフォルトの `onRetry` で即座に（`resetDb()` のみ実行して）再試行しており、
遅延がない。挙動をそろえるか、意図的な非対称であることを明記するか判断が必要。

### 実機（iOS PWA）での視覚確認が未実施の変更

直近の複数の UI 変更が、実機の iOS PWA でまだ視覚確認できていない。
