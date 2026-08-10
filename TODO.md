# TODO

## lint/performance/noJsxPropsBind の段階的解消

ultracite 7.9 で追加されたルール。既存コード全体（113 箇所 / 28 ファイル）がアロー関数 props 前提のため、
現在は `biome.jsonc` で `off` にしている。解消できたら `off` を外す。

### 方針

- 効果があるのは「memo 化された子コンポーネント」「リストで大量に描画されるコンポーネント」への props のみ。
  それ以外の箇所を機械的に `useCallback` 化しても再レンダリング削減効果はなく可読性だけ下がる
- 対応順の推奨:
  1. リスト描画される `HabitListCard` / `HabitCircleItem` / `TaskCircle` を `React.memo` 化し、
     親（`HabitListView` / `HabitSimpleView` / `DashboardWrapper`）から渡すハンドラを
     `useCallback` 化する（habitId をクロージャで束ねている箇所は「habitId を引数で受けるコールバック +
     子側で束ねる」形に変える）
  2. `DashboardWrapper`（16 箇所）はロジックが多いのでカスタムフックへの切り出しと同時に実施
  3. 単発 1〜2 箇所のファイル（ダイアログ・設定系）は memo 境界がなければ対応不要。
     ルールを on に戻す際は scoped override で除外するか、素直に関数抽出する
- React Compiler（`reactCompiler`）を導入する場合はコンパイラが自動 memo 化するため
  このルール自体を恒久 off にする判断もあり得る。導入判断とセットで再検討する

### 主な該当ファイル（多い順）

- `src/app/(dashboard)/dashboard/DashboardWrapper.tsx` (16)
- `src/components/habits/HabitFormServer.tsx` (14)
- `src/components/streak/HabitListCard.tsx` (13)
- `src/components/streak/HabitSimpleView.tsx` (10)
- `src/components/dashboard/HabitActionDrawer.tsx` (9)
- `src/components/streak/HabitListView.tsx` (6)
- そのほか 1〜5 箇所のファイルが 22 件（`pnpm exec biome lint --only=performance/noJsxPropsBind src` で一覧可能）

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
