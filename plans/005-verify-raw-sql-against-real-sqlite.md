# Plan 005: チェックインの raw SQL を実 SQLite で検証するテストを追加する

> **Executor instructions**: 上から順に実行し、各ステップの検証コマンドと期待結果を確認してから次へ進んでください。
> 「STOP conditions」に該当したら改変を止めて報告します。**コミットはしないでください**。
>
> **重要**: この計画は**テストの追加のみ**です。`src/lib/queries/checkin.ts` の実装は変更しません。
>
> **Drift check（最初に実行）**:
> `git diff --stat 88f423b..HEAD -- src/lib/queries/checkin.ts src/db/schema.ts drizzle/`
> 出力が空でない場合、下の「Current state」の抜粋と実コードを突き合わせ、一致しなければ STOP。

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `88f423b`, 2026-08-10

## Why this matters

チェックインの中核クエリ 2 本は、Drizzle のクエリビルダではなく **`sql` テンプレートで書かれた
raw SQL** です。D1 がトランザクションを提供しないため、頻度上限チェックを
`INSERT ... SELECT ... WHERE (相関サブクエリ) < frequency RETURNING *` に埋め込んでレースを避ける、
という設計判断によるものです（コード内コメントに記載あり）。

問題は検証方法です。既存テスト `src/lib/queries/__tests__/checkin.test.ts` は
**`drizzle-orm` モジュールを丸ごと `vi.mock` で置き換えています**。
そのため `sql` テンプレートは文字列としてすら組み立てられず、
**SQL の構文誤りがテストを素通りします**。このリポジトリでは過去に
「raw SQL の構文ミスがモックテストをすり抜けた」事故が起きています。

この計画では、`node:sqlite`（Node 24 標準。**新規依存の追加は不要**）で本物の SQLite を用意し、
実際のスキーマに対して当該 SQL を実行するテストを追加します。

## Current state

対象ファイル:

- `src/lib/queries/checkin.ts` — 検証対象の raw SQL 2 本を含む。**変更しない**。
- `src/db/schema.ts` — Drizzle スキーマ定義。
- `drizzle/0000_adorable_impossible_man.sql` 〜 `drizzle/0003_skip_and_reminder.sql` — マイグレーション SQL。
- `src/lib/queries/__tests__/checkin.test.ts` — 既存のモックテスト。**変更しない**。

### 検証対象 1 — `src/lib/queries/checkin.ts:116-124`

```ts
const insertedRows = await db.all<Record<string, unknown>>(sql`
        INSERT INTO ${checkins} ("id", "habitId", "date", "createdAt")
        SELECT ${newId}, ${input.habitId}, ${dateKey}, ${createdAt}
        WHERE (
          SELECT count(*) FROM ${checkins}
          WHERE ${checkins.habitId} = ${input.habitId} AND ${checkins.date} BETWEEN ${startKey} AND ${endKey}
        ) < ${input.frequency}
        RETURNING *
      `);
```

### 検証対象 2 — `src/lib/queries/checkin.ts:191-201`

```ts
const [deleted] = await db
  .delete(checkins)
  .where(
    sql`${checkins.id} = (
            SELECT ${checkins.id} FROM ${checkins}
            WHERE ${checkins.habitId} = ${habitId} AND ${checkins.date} >= ${startKey} AND ${checkins.date} <= ${endKey}
            ORDER BY ${checkins.date} DESC, ${checkins.createdAt} DESC
            LIMIT 1
          )`,
  )
  .returning();
```

### 既存モックテストが素通りする理由 — `src/lib/queries/__tests__/checkin.test.ts:3-13`

```ts
vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => ({ conditions, op: "and" }),
  // ...
  sql: Object.assign((...values: unknown[]) => ({ sql: values }), {
    mapWith: (fn: unknown) => fn,
    raw: (str: string) => ({ raw: str }),
  }),
}));
```

`sql` が単なるオブジェクト生成関数に差し替わるため、SQL 文字列は一度も作られません。

### 利用可能な検証手段（確認済み）

- Node 24.13.0 の `node:sqlite`（`DatabaseSync`）が利用可能です。
  実行時に `ExperimentalWarning: SQLite is an experimental feature` が出ますが動作します。
  **新しい npm パッケージを追加しないでください。**
- Drizzle の D1 ドライバは `drizzle-orm/d1` の `drizzle(d1Database, { schema })` です
  （`src/lib/db.ts:22`）。D1 の interface（`prepare().bind().all()/run()/first()`、`batch`、`exec`）を
  `node:sqlite` で満たすシムを作れば、本物の Drizzle が SQL を組み立てて実行します。

### 従うべきリポジトリの規約

- テストは `src/lib/queries/__tests__/` 配下、`*.test.ts`。
- **型アサーション（`as`）と `any` の新規導入は禁止**。シムの型付けは
  `@cloudflare/workers-types`（devDependencies に導入済み）の `D1Database` を使うか、
  必要最小限の interface を自前で定義してください。
- vitest の既定 environment は `jsdom` です（`vitest.config.ts`）。
  `node:sqlite` を使うテストファイルの先頭に
  `// @vitest-environment node` を書いてください。
- **オブジェクトキーはアルファベット順**（Biome 規約）。

## Commands you will need

| 目的                   | コマンド                                                                                              | 成功時の期待 |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------ |
| 型チェック             | `pnpm tsc --noEmit`                                                                                   | exit 0       |
| Lint / format          | `pnpm exec biome check --write src`                                                                   | exit 0       |
| テスト（絞り込み）     | `pnpm test:run -- checkin-sql`                                                                        | 全 pass      |
| テスト（全体）         | `pnpm test:run`                                                                                       | 全 pass      |
| node:sqlite の動作確認 | `node -e "const{DatabaseSync}=require('node:sqlite');new DatabaseSync(':memory:');console.log('ok')"` | `ok`         |

## Scope

**In scope**:

- `src/lib/queries/__tests__/checkin-sql.test.ts`（新規作成）
- `src/lib/queries/__tests__/helpers/sqlite-d1.ts`（新規作成。D1 シム。ファイル名は変えてよい）

**Out of scope（触らない）**:

- `src/lib/queries/checkin.ts` — **実装は 1 行も変更しない**。テストは現状の実装を対象にします。
- `src/lib/queries/__tests__/checkin.test.ts` — 既存のモックテストは残します（削除も改変もしない）。
- `src/db/schema.ts` / `drizzle/**` — スキーマとマイグレーションは変更しません。
- `package.json` — **依存の追加は禁止**。
- `vitest.config.ts` — 設定変更は不要なはずです（ファイル先頭の environment コメントで足ります）。

## Steps

### Step 0: 前提の確認

```bash
node -e "const{DatabaseSync}=require('node:sqlite');new DatabaseSync(':memory:');console.log('ok')"
```

→ `ok` が出ること。出なければ STOP。

### Step 1: D1 互換シムを作る

`src/lib/queries/__tests__/helpers/sqlite-d1.ts` を新規作成し、
`node:sqlite` の `DatabaseSync` を包んで D1 の interface を満たすオブジェクトを返す
`createSqliteD1()` を export します。

Drizzle の D1 ドライバが実際に呼ぶのは主に次です（実装しながら確認してください）:

- `prepare(query: string)` → `{ bind(...values), all(), run(), first(), raw() }`
- `batch(statements)` — 今回のテストで使われなければ、呼ばれたら明示的に throw する実装でよい
- `exec(query: string)` — スキーマ作成に使う

`all()` は `{ results, success, meta }` の形を返します。
**推測で書かず、まず素朴に実装してテストを流し、Drizzle が投げるエラーを見て埋めてください。**
`node_modules/drizzle-orm/d1/` の実装を読むのが最短です。

**Verify**: `pnpm tsc --noEmit` → exit 0

### Step 2: テーブルを作る

`src/lib/queries/__tests__/checkin-sql.test.ts` を新規作成します。
`beforeEach` で in-memory DB を作り、`Checkin` / `Habit` テーブルを作成します。

スキーマ SQL の入手方法は 2 択です。上から順に試してください。

1. `drizzle/*.sql` を `node:fs` で読み、順に `exec()` する（実際のマイグレーションと完全に一致する）
2. 1 がコメント記法（`--> statement-breakpoint`）などで詰まる場合は、
   `src/db/schema.ts` の定義に対応する `CREATE TABLE` を**テスト内に手書き**する。
   その場合、カラム名・型・NOT NULL・外部キーを `src/db/schema.ts` と突き合わせ、
   一致していることをコメントで明記すること。

**この計画は「SQL が実 SQLite で動くか」を見るのが目的なので、
テーブル定義が実マイグレーションと乖離すると価値が失われます。** 1 を優先してください。

**Verify**: テーブル作成後に `SELECT name FROM sqlite_master WHERE type='table'` の結果に
`Checkin` と `Habit` が含まれることを assert するテストを 1 件書き、pass すること。

### Step 3: `getDb` をシムに差し替える

`src/lib/queries/checkin.ts` は `getDb()`（`@/lib/db`）を呼びます。
テストでは `vi.mock('@/lib/db', ...)` で、Step 1 のシムを `drizzle(shim, { schema })` に
渡したインスタンスを返すようにします。

**`drizzle-orm` 自体はモックしないこと。** これがこの計画の全目的です。
`grep` で確認できるようにしてください。

**Verify**:

```bash
grep -n "vi.mock('drizzle-orm'" src/lib/queries/__tests__/checkin-sql.test.ts
```

→ マッチ 0 件

### Step 4: `createCheckinWithLimit` の振る舞いを実 SQL で検証する

`describe('createCheckinWithLimit (real SQLite)')` に次のケースを書きます。
すべて period `'daily'`、`weekStartDay: 1` で構いません。

1. **構文が通ること**: habit を 1 件 INSERT した状態で `createCheckinWithLimit` を呼び、
   例外が投げられず `created: true` / `currentCount: 1` が返る
2. **上限で止まること**: `frequency: 1` の habit に対し 2 回呼ぶと、
   2 回目は `created: false` / `currentCount: 1` が返り、
   `SELECT count(*) FROM Checkin` が 1 のまま
3. **上限まで入ること**: `frequency: 3` で 3 回呼ぶと 3 件入り、4 回目が `created: false`
4. **期間外は上限に数えないこと**: 期間の範囲外（前月など）に既存チェックインを直接 INSERT
   しておいても、当日の `createCheckinWithLimit` が成功する
5. **RETURNING の行が壊れないこと**: 成功時の `result.checkin` の
   `id` / `habitId` / `date` / `createdAt` がすべて string で、値が入力と整合する
   （`parseInsertedCheckinRow` が投げる 2 種類の Error にかからないこと）

**Verify**: `pnpm test:run -- checkin-sql` → 全 pass

### Step 5: `deleteLatestCheckinByHabitAndPeriod` を実 SQL で検証する

`describe('deleteLatestCheckinByHabitAndPeriod (real SQLite)')` に:

1. **構文が通ること**: 期間内に 1 件ある状態で呼ぶと `deleted: true` / `currentCount: 0`
2. **1 件だけ消えること**: 期間内に 3 件ある状態で 1 回呼ぶと、残り 2 件。
   `currentCount` が 2
3. **最新が消えること**: 日付の異なる複数件（例: 同一週内の 3 日分）を入れて呼ぶと、
   **`date` が最も新しい行**が消える。残った行の date を assert する
4. **同日複数件のときは createdAt が新しい方が消えること**（ORDER BY の 2 段目の検証）
5. **対象なしのとき DELETE を発行せず終わること**: 期間内 0 件で呼ぶと
    `deleted: false` / `currentCount: 0`、例外なし
6. **期間外の行を消さないこと**: 期間外に 1 件だけある状態で呼ぶと `deleted: false` で、
    その行が残っている

**Verify**: `pnpm test:run -- checkin-sql` → 全 pass

### Step 6: 全体ゲート

**Verify**:

```bash
pnpm exec biome check --write src && pnpm tsc --noEmit && pnpm test:run
```

→ すべて exit 0。既存 148 件が 1 件も落ちていないこと

## Test plan

- 新規: `src/lib/queries/__tests__/checkin-sql.test.ts` に上記 1〜11 の 11 ケース以上
- 新規: `src/lib/queries/__tests__/helpers/sqlite-d1.ts`（テストヘルパー。単体テストは不要）
- 既存の `checkin.test.ts` は**そのまま残す**。役割が違います
  （あちらは呼び出し引数の検証、こちらは SQL 自体の検証）
- モックしてよいのは `@/lib/db` の `getDb` だけ。`drizzle-orm` はモック禁止

## Done criteria

すべて満たすこと:

- [ ] `pnpm tsc --noEmit` が exit 0
- [ ] `pnpm test:run` が exit 0。新規 11 ケース以上が pass し、既存 148 件も pass
- [ ] `grep -n "vi.mock('drizzle-orm'" src/lib/queries/__tests__/checkin-sql.test.ts` が 0 件
- [ ] `git diff --stat src/lib/queries/checkin.ts` が空（実装が変更されていない）
- [ ] `git diff --stat package.json pnpm-lock.yaml` が空（依存が追加されていない）
- [ ] `grep -rn " as \| any" src/lib/queries/__tests__/helpers/` に型アサーション・`any` の新規導入が無い
- [ ] `git status --short` の変更ファイルが In scope の 2 ファイルのみ
- [ ] `plans/README.md` の 005 の行の Status を更新（レビュアーが管理すると言われた場合は不要）

## STOP conditions

- `node:sqlite` が利用できない（Step 0 が失敗する）
- D1 シムが Drizzle の期待を満たせず、**妥当な試行を 2 回行っても** `drizzle-orm/d1` の
  内部エラーが解消しない
  → **モックへ後退してテストを通すのは禁止です**。それでは既存テストと同じ穴が残ります。
  詰まったエラーの全文と、`node_modules/drizzle-orm/d1/` のどこで詰まったかを添えて報告してください
- テストを通すために `src/lib/queries/checkin.ts` を変更したくなった
  → **変更しないこと**。SQL に実際の不具合が見つかった場合こそ、この計画の最大の成果です。
  再現するテストを残し、実装は直さずに報告してください
- `drizzle/*.sql` から作ったテーブルに対して SQL が構文エラーになる
  → **これは想定される成果です。** テストを削らず、エラー全文を報告してください

## Maintenance notes

- 今後 `sql` テンプレートで raw SQL を書くときは、**必ずこのテストファイルにケースを足す**こと。
  モックテストだけでは構文誤りを検出できません。
- `node:sqlite` は SQLite であって D1 そのものではありません。
  D1 固有の制約（トランザクション不可、`batch` の挙動）は再現されません。
  このテストが守るのは「SQL 構文と結果セットの形」であり、D1 の運用挙動ではありません。
- レビュー時に見るべき点: `drizzle-orm` がモックされていないこと、
  `checkin.ts` に差分が無いこと、テーブル定義が `drizzle/*.sql` 由来であること。
