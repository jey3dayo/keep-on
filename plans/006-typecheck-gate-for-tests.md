# Plan 006: テストファイルを型チェックの対象にし、露見した型契約バグを直す

> **Executor instructions**: 上から順に実行し、各ステップの検証コマンドと期待結果を確認してから次へ進んでください。
> 「STOP conditions」に該当したら改変を止めて報告します。**コミットはしないでください**。
>
> **Drift check（最初に実行）**:
> `git diff --stat 88f423b..HEAD -- tsconfig.json mise.toml package.json .github/workflows/ci.yml src/lib/queries/habit-read.ts src/lib/queries/habit.ts`
> `src/lib/queries/habit-read.ts` には別作業による差分（`export` 追加と `gte(...)` 追加）があります。これは想定内です。
> それ以外のファイルに差分があれば、下の「Current state」と突き合わせ、一致しなければ STOP。

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none（ただし plans/001〜005 が適用済みの作業ツリーを前提にする）
- **Category**: dx
- **Planned at**: commit `88f423b`, 2026-08-10

## Why this matters

`tsconfig.json` がテストファイルを exclude しているため、**テストの型エラーはどのゲートも通過します**。

- `mise run lint:types`（`pnpm tsc --noEmit`）— exclude により対象外
- vitest — esbuild が型を剥がすだけで検査しない
- GitHub CI の `pnpm lint` — 実体は `ultracite check`（Biome）のみで、型チェックを含まない

直近の作業で実際に 2 回、この穴が型エラーを見逃しました。

さらに、この穴を塞ぐために計測したところ、**本番コードの型契約バグ**が露見しました。
`tsconfig.json` は `strict: true` ですが `noUncheckedIndexedAccess` が無効なため、
配列分割代入の要素が「必ず存在する」と推論され、`?? null` フォールバックが戻り値型から消えています。
つまり `getHabitById` は実行時に `null` を返しうるのに、型は非 null を主張しています。
呼び出し側の `if (!habit)` チェックは型上デッドコード扱いです。

この計画は、ゲートを作り、露見した実バグを直し、直せない部分を明示的に隔離します。

## Current state

### 1. `tsconfig.json:33-40`（テストを除外している箇所）

```jsonc
  "exclude": [
    "node_modules",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/*.stories.ts",
    // ... stories 系が続く
  ],
```

`"strict": true` は `:8` にありますが、`noUncheckedIndexedAccess` は**設定されていません**。

### 2. 型契約バグ — `src/lib/queries/habit-read.ts:111-121`

```ts
export async function getHabitById(id: string) {
  return await profileQuery(
    "query.getHabitById",
    async () => {
      const db = getDb();
      const [habit] = await db.select().from(habits).where(eq(habits.id, id));
      return habit ?? null;
    },
    { habitId: id },
  );
}
```

`noUncheckedIndexedAccess` が無効なので `habit` は非 undefined と推論され、`habit ?? null` の型は
`null` を含みません。同じ形が `src/lib/queries/habit.ts:47` 付近の `updateHabit` にもあります
（**着手前に該当行を自分で確認してください**）。

呼び出し側は null を想定しています。例: `src/app/actions/habits/utils.ts:63-75` の `requireOwnedHabit`。

### 3. 実測したエラー内訳（probe 済み。推測ではありません）

テストのみを対象に、`types: ["node", "vitest/globals", "@testing-library/jest-dom", "@cloudflare/workers-types"]`
で型チェックすると **58 件**。内訳:

| ファイル                                              | 件数 | 性質                            |
| ----------------------------------------------------- | ---- | ------------------------------- |
| `src/lib/queries/__tests__/habit.test.ts`             | 22   | Drizzle fluent モックの型不整合 |
| `src/lib/queries/__tests__/checkin.test.ts`           | 20   | 同上                            |
| `src/lib/queries/__tests__/user.test.ts`              | 7    | 同上                            |
| `src/components/dashboard/HabitActionDrawer.test.tsx` | 5    | fixture の型ドリフト（実バグ）  |
| `src/app/actions/habits/__tests__/archive.test.ts`    | 1    | 上記の型契約バグを検出          |
| `src/app/actions/habits/__tests__/delete.test.ts`     | 1    | 同上                            |
| `src/app/actions/habits/__tests__/unarchive.test.ts`  | 1    | 同上                            |
| `src/app/actions/habits/__tests__/update.test.ts`     | 1    | 同上                            |

上位 3 ファイルの 49 件は `Property 'where' does not exist on type 'DrizzleD1Database<...>'` 系で、
`vi.mock('@/lib/db')` が返す chainable モックが実型と構造的に合わないことに起因します。

`HabitActionDrawer.test.tsx` の 5 件は、fixture が `HabitWithProgress` から
`skippedToday` と `reminderTime` を欠いているものです（スキーマ追加に fixture が追随していない）。

### 4. 既存の型チェックタスク

`mise.toml`:

```toml
[tasks."lint:types"]
description = "TypeScriptの型チェックのみ"
run = "pnpm tsc --noEmit"

[tasks.lint]
depends = ["lint:types", "lint:biome", "lint:md", "lint:yaml"]

[tasks.ci]
depends = ["lint:types", "lint:biome", "test:ci", "build:ci"]
```

`package.json` には `"test:e2e:types": "tsc --project tsconfig.e2e.json --noEmit"` が既にありますが、
**CI にも pre-push にも接続されていません**。`tsconfig.e2e.json` が別 tsconfig の実例なので、
新規ファイルはこれを構成の手本にしてください。

`.github/workflows/ci.yml:65-66`:

```yaml
- name: Run lint
  run: pnpm lint
```

`pnpm lint` = `ultracite check` のみ。型チェックは CI に無い。

### 従うべきリポジトリの規約

- **`any` 型・型アサーションの新規導入は禁止**。この計画では特に重要です
  （fluent モックを `as unknown as` で本物の DB 型に偽装するのは**禁止**。理由は下記 Scope 参照）。
- **linter の warning/error は inline disable でなく設定ファイル側で対策する**。
  `@ts-expect-error` / `@ts-ignore` をテストに撒くのは禁止です。
- オブジェクトキーはアルファベット順（Biome 規約）。
- コメントは「コードから読み取れない判断理由」のみ書く。

## Commands you will need

| 目的                     | コマンド                                              | 成功時の期待           |
| ------------------------ | ----------------------------------------------------- | ---------------------- |
| 本番型チェック           | `pnpm tsc --noEmit`                                   | exit 0                 |
| テスト型チェック（新設） | `pnpm exec tsc --project tsconfig.test.json --noEmit` | exit 0                 |
| Lint / format            | `pnpm exec biome check --write <担当ファイル>`        | exit 0                 |
| テスト                   | `pnpm test:run`                                       | 全 pass（現状 183 件） |
| ビルド                   | `pnpm build:cf`                                       | 成功                   |

## Scope

**In scope**:

- `tsconfig.test.json`（新規作成）
- `package.json` — スクリプト追加のみ
- `mise.toml` — タスク追加と依存の接続
- `.github/workflows/ci.yml` — 型チェックを CI に接続
- `src/lib/queries/habit-read.ts` — `getHabitById` の戻り値型の修正のみ
- `src/lib/queries/habit.ts` — 同型の関数があれば同じ修正のみ
- `src/components/dashboard/HabitActionDrawer.test.tsx` — fixture の修正
- `TODO.md` — quarantine の記録

**Out of scope（触らない）**:

- **`tsconfig.json` の `exclude` からテストを外すこと**。本番 tsconfig に Node/Vitest の型を
  混ぜると、Workers 向け本番コードで Node API を誤用しても検出できなくなります。責務を分けます。
- **`noUncheckedIndexedAccess` を有効にすること**。影響範囲が全コードに及び、この計画の射程を超えます。
  今回は `getHabitById` / `updateHabit` の戻り値型を個別に直すに留めます。
- **`src/lib/queries/__tests__/{habit,checkin,user}.test.ts` の 49 件を直すこと**。
  これらは quarantine します。理由: fluent Drizzle モックを型アサーションで本物の DB 型に
  偽装しても、Drizzle が実際に生成する SQL の正しさは一切強くなりません。
  正しい出口は「実 SQLite テストへの移行」で、それは別計画です
  （`src/lib/queries/__tests__/checkin-sql.test.ts` が成立を実証済み）。
- Storybook の `*.stories.tsx` — 今回の対象外。TODO.md に後続課題として記録するだけ。
- `tsconfig.e2e.json` の CI 接続 — 既存だが未接続。今回は記録のみ。

## Steps

### Step 1: `tsconfig.test.json` を作る

`tsconfig.e2e.json` を構成の手本にして、リポジトリ直下に `tsconfig.test.json` を新規作成します。

要件:

- `"extends": "./tsconfig.json"`
- `compilerOptions`:
  - `"noEmit": true`
  - `"types": ["node", "vitest/globals", "@testing-library/jest-dom", "@cloudflare/workers-types"]`
  - `"tsBuildInfoFile"` を指定する場合は `.gitignore` の `*.tsbuildinfo` に載る名前にすること
- `"include"`: テスト関連のみ。`src/**/*.test.ts`、`src/**/*.test.tsx`、`src/**/*.d.ts`、
  `vitest.setup.ts`、`vitest.mocks.tsx`、`next-env.d.ts`
- `"exclude"`: `node_modules` と、**quarantine する 3 ファイルの完全パス**
  - `src/lib/queries/__tests__/habit.test.ts`
  - `src/lib/queries/__tests__/checkin.test.ts`
  - `src/lib/queries/__tests__/user.test.ts`
  - **glob やディレクトリ単位で除外しないこと。** 完全一致の 3 行だけにします。
    そうしないと、同ディレクトリに新規追加されたテスト（`checkin-sql.test.ts` など）まで
    黙って対象外になります。
- exclude の直前に、なぜこの 3 ファイルだけ除外するのか、
  どうなったら除外を解除できるのか（実 SQLite テストへ移行したら）をコメントで書くこと。
  JSON でコメントが使えない場合は `tsconfig.test.json` を JSONC として扱えるか確認し、
  無理なら `TODO.md` 側に書いてこのファイルには書かないこと。

**Verify**:

```bash
pnpm exec tsc --project tsconfig.test.json --noEmit
```

→ この時点ではまだ **9 件のエラー**（`HabitActionDrawer.test.tsx` 5 件 + action test 4 件）が出るのが正常です。
出力を報告に貼ってください。件数が 9 でない場合は STOP conditions を確認。

### Step 2: 本番コードの型契約バグを直す

`src/lib/queries/habit-read.ts` の `getHabitById`（:111-121）の戻り値型に `null` が
含まれるようにします。実行時の挙動は**変えないでください**（今も null を返しています。
型が追いついていないだけです）。

推奨する直し方（型アサーションを使わずに済む形）:

- 明示的な戻り値型注釈を付ける、または
- `const [habit] = ...` を `rows.at(0) ?? null` の形にする

どちらでも構いませんが、**`as` を使わないこと**。

同じ形の関数が `src/lib/queries/habit.ts` にもあります（`updateHabit` 付近）。
まず該当箇所を自分で読んで確認し、同型なら同じ修正を当ててください。
同型でなければ触らず、その旨を報告してください。

この修正で `src/app/actions/habits/__tests__/{archive,delete,unarchive,update}.test.ts` の
4 件のエラーが解消するはずです。

**Verify**:

```bash
pnpm tsc --noEmit
pnpm exec tsc --project tsconfig.test.json --noEmit 2>&1 | grep -c "error TS"
pnpm test:run
```

→ 1 つ目は exit 0。2 つ目は **5 件**（action test の 4 件が消えている）。
3 つ目は 183 件全 pass（**テストの期待値を書き換えて通してはいけません**）。

### Step 3: fixture の型ドリフトを直す

`src/components/dashboard/HabitActionDrawer.test.tsx` の fixture に、
`HabitWithProgress` が要求する `skippedToday` と `reminderTime` を追加します。

値は `src/types/habit.ts` の型定義と `src/db/schema.ts` を読んで、
このテストの意図に合うものを選んでください（多くの場合 `skippedToday: false`、
`reminderTime: null` が妥当ですが、**テストの各ケースが何を検証しているかを読んでから**決めること）。

fixture を共通化できるなら 1 箇所にまとめて構いませんが、
**既存テストの検証内容を変えないこと**。

**Verify**:

```bash
pnpm exec tsc --project tsconfig.test.json --noEmit
pnpm exec vitest run src/components/dashboard/HabitActionDrawer.test.tsx
```

→ 1 つ目は **exit 0、エラー 0 件**。2 つ目は全 pass。

### Step 4: ゲートに接続する

3 箇所に接続します。

1. `package.json` の `scripts` に型チェック用のスクリプトを追加
   （命名は既存の `test:e2e:types` に揃えること）
2. `mise.toml` にタスクを追加し、`lint` と `ci` の `depends` に加える
   （既存の `lint:types` の直後に走る位置）
3. `.github/workflows/ci.yml` の "Check: Lint" ジョブに、**本番型チェックとテスト型チェックの両方**を
   実行するステップを追加する。現在この CI は `pnpm lint`（Biome のみ）しか走らせておらず、
   型チェックが一切ありません。`pnpm tsc --noEmit` も併せて追加してください。

ci.yml を編集したら、必ず actionlint を通してください（CI 自身が `Check: Actionlint` を持っています）。

**Verify**:

```bash
mise run lint:types
mise run <追加したタスク名>
pnpm exec actionlint .github/workflows/ci.yml || mise exec -- actionlint .github/workflows/ci.yml
mise exec -- yamllint -c .yamllint .github/workflows/ci.yml
```

→ すべて exit 0

### Step 5: ゲートが本当に効くことを確認する（省略禁止）

新設したゲートが空振りでないことを実証します。

1. 任意のテストファイル（quarantine 対象外）に、意図的な型エラーを 1 行入れる
   （例: `const broken: number = 'not a number'`）
2. `pnpm exec tsc --project tsconfig.test.json --noEmit` が**失敗する**ことを確認
3. その 1 行を**削除する**
4. 再実行して exit 0 に戻ることを確認

この対照実験の出力（失敗時と成功時の両方）を報告に貼ってください。
**手順 3 の削除を忘れないこと。**

### Step 6: quarantine を記録する

`TODO.md` に節を追加します。内容:

- quarantine 中の 3 ファイルの完全パス
- 理由（Drizzle fluent モックの型不整合。アサーションで偽装しても SQL の正しさは強くならない）
- **解除条件**（各ファイルを実 SQLite ベースのテストへ移行したら `tsconfig.test.json` の
  exclude から削除する。手本は `src/lib/queries/__tests__/checkin-sql.test.ts` と
  `src/lib/queries/__tests__/helpers/sqlite-d1.ts`）
- 併せて「後続課題」として次の 2 つを記録:
  - `*.stories.tsx` も型チェック対象外のままであること
  - `tsconfig.e2e.json` を使う `pnpm test:e2e:types` が CI に接続されていないこと

`TODO.md` の既存の書式（見出しレベル、日本語の書き方）に揃えてください。

**Verify**: `pnpm exec markdownlint-cli2 --no-globs --fix TODO.md` → exit 0

### Step 7: 全体ゲート

**Verify**:

```bash
pnpm exec biome check --write <変更した .ts/.tsx/.json ファイルを列挙>
pnpm tsc --noEmit
pnpm exec tsc --project tsconfig.test.json --noEmit
pnpm test:run
pnpm build:cf
```

→ すべて成功。`test:run` は 183 件全 pass。

## Test plan

- 新規テストは書きません。この計画はゲートの追加と既存の型不整合の解消です。
- Step 5 の対照実験が、ゲートが機能することの証明です。**省略しないでください。**
- 既存 183 件のテストが 1 件も落ちないことが、型修正が挙動を変えていないことの証明です。

## Done criteria

すべて満たすこと:

- [ ] `pnpm tsc --noEmit` が exit 0
- [ ] `pnpm exec tsc --project tsconfig.test.json --noEmit` が **exit 0、エラー 0 件**
- [ ] `pnpm test:run` が 183 件全 pass（**期待値の書き換えなし**）
- [ ] `pnpm build:cf` が成功
- [ ] `grep -c "test.ts" tsconfig.test.json` の exclude 部分が完全一致 3 ファイルのみ
      （glob やディレクトリ指定が無いこと）
- [ ] `grep -rn "as unknown as\|@ts-expect-error\|@ts-ignore\| as any" <今回変更した全ファイル>` が 0 件
- [ ] `.github/workflows/ci.yml` に本番型チェックとテスト型チェックの両方が入っている
- [ ] Step 5 の対照実験の出力（失敗時・成功時の両方）が報告に含まれ、
      意図的なエラー行が削除済みであること（`git status` で確認）
- [ ] `TODO.md` に quarantine の記録と解除条件がある
- [ ] `git status --short` の変更ファイルが In scope のリストのみ
- [ ] 一時ファイル（probe 用 tsconfig、`.tsbuildinfo` の残骸）が残っていないこと

## STOP conditions

- Step 1 の時点でエラーが 9 件でない
  → 作業ツリーの状態が計画作成時と違います。実際の件数と内訳を報告してください
- Step 2 の修正で `pnpm tsc --noEmit`（本番）が壊れる、または `pnpm test:run` が落ちる
  → **テストの期待値を書き換えて通さないこと**。落ちた内容を報告してください
- `src/lib/queries/habit.ts` に `getHabitById` と同型の関数が見つからない
  → 触らず、実際に何があったかを報告してください
- 型アサーション・`@ts-expect-error` を使わないとエラーが消せない箇所が出た
  → **使わずに STOP** してください。そのファイルを quarantine に足す判断は人間が行います
- Step 4 で ci.yml を編集した結果、actionlint または yamllint が通らない
- 同じ検証コマンドが、妥当な修正を 2 回試しても失敗する

## Maintenance notes

- **quarantine の 3 ファイルは放置すると形骸化します。** 解除条件は
  「実 SQLite ベースのテストへ移行」であり、`checkin-sql.test.ts` がその手本です。
  1 ファイルずつ移行し、移行したら `tsconfig.test.json` の exclude から必ず 1 行削除してください。
- **`noUncheckedIndexedAccess` の有効化は未着手です。** 今回は `getHabitById` /
  `updateHabit` の戻り値型を個別に直しただけで、同じパターン
  （`const [x] = await db.select()...`）はコードベース全体に他にもあります。
  有効化すると同種のバグが一括で露見しますが、影響範囲が大きいので別途計画してください。
- レビュー時に見るべき点: exclude が完全一致 3 行か、型アサーションが混入していないか、
  Step 5 の対照実験の証跡があるか、意図的なエラー行が消えているか。
