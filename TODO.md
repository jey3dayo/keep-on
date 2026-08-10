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

### 後続課題

- `*.stories.tsx` は `tsconfig.test.json` の対象外のまま（Storybook 型チェックは今回のスコープ外）
- `tsconfig.e2e.json` を使う `pnpm test:e2e:types` は CI・pre-push いずれにも未接続
