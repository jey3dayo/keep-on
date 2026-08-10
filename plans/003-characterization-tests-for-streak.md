# Plan 003: ストリーク計算に特性テスト（characterization tests）を張る

> **Executor instructions**: 上から順に実行し、各ステップの検証コマンドと期待結果を確認してから次へ進んでください。
> 「STOP conditions」に該当したら改変を止めて報告します。**コミットはしないでください**。
>
> **重要**: この計画は「今の挙動を壊さずに固定する」ことが目的です。
> **ロジックのバグを見つけても直さないでください。** 現在の挙動をそのままテストに書き、
> 疑わしい点は報告に「観察された挙動」として列挙してください。
>
> **Drift check（最初に実行）**:
> `git diff --stat 88f423b..HEAD -- src/lib/queries/habit-read.ts`
> 出力が空でない場合、下の「Current state」の抜粋と実コードを突き合わせ、一致しなければ STOP。

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `88f423b`, 2026-08-10

## Why this matters

このアプリの中核価値は「習慣の継続日数（ストリーク）を正しく見せること」です。
その計算は `src/lib/queries/habit-read.ts` の `calculateStreakFromCheckins` に集約されていますが、
**テストが 1 件も存在しません**。関数は 70 行あり、期間（daily / weekly / monthly）の遡行、
週の開始曜日、スキップの連続許容（最大 3 回）、frequency の正規化という 4 つの軸が絡みます。
後続の計画 004 でこの関数に渡すデータ量を「直近 1 年分」に制限する変更が入る予定で、
その変更が既存の計算結果を変えないことを保証する土台が必要です。
この計画では**挙動を一切変えず**、現在の入出力を固定するテストだけを追加します。

## Current state

対象ファイル:

- `src/lib/queries/habit-read.ts` — 習慣読み取りとストリーク計算。413 行。対応テストなし。

### `src/lib/queries/habit-read.ts:341-413`（テスト対象の関数。現状のまま）

```ts
function calculateStreakFromCheckins(
  habit: HabitSchedule,
  habitCheckins: Array<{ date: Date | string }>,
  weekStartDay: WeekStartDay = 1,
  baseDate: Date | string = new Date(),
  skips: Array<{ date: Date | string }> = []
): number {
  if (habitCheckins.length === 0 && skips.length === 0) {
    return 0
  }

  const { frequency: normalizedFrequency, period: normalizedPeriod } = normalizeHabitSchedule(
    { frequency: habit.frequency, habitId: habit.id, period: habit.period },
    'calculateStreakFromCheckins'
  )

  let streak = 0
  let currentDate = startOfDay(baseDate)

  const checkinsByPeriod = new Map<string, number>()
  for (const checkin of habitCheckins) {
    const checkinDate = normalizeCheckinDate(checkin.date)
    const periodKey = getPeriodKey(checkinDate, normalizedPeriod, weekStartDay)
    checkinsByPeriod.set(periodKey, (checkinsByPeriod.get(periodKey) ?? 0) + 1)
  }

  const skippedPeriods = new Set<string>()
  for (const skip of skips) {
    const skipDate = normalizeCheckinDate(skip.date)
    const periodKey = getPeriodKey(skipDate, normalizedPeriod, weekStartDay)
    skippedPeriods.add(periodKey)
  }

  const currentPeriodKey = getPeriodKey(currentDate, normalizedPeriod, weekStartDay)
  const currentCount = checkinsByPeriod.get(currentPeriodKey) ?? 0
  const currentSkipped = skippedPeriods.has(currentPeriodKey)

  if (currentCount < normalizedFrequency && !currentSkipped) {
    currentDate = getPreviousPeriod(currentDate, normalizedPeriod)
  }

  let consecutiveSkips = 0
  const MAX_CONSECUTIVE_SKIPS = 3

  for (let iteration = 0; iteration < MAX_STREAK_ITERATIONS; iteration += 1) {
    const periodKey = getPeriodKey(currentDate, normalizedPeriod, weekStartDay)
    const count = checkinsByPeriod.get(periodKey) ?? 0
    const skipped = skippedPeriods.has(periodKey)

    if (count >= normalizedFrequency) {
      streak++
      consecutiveSkips = 0
      currentDate = getPreviousPeriod(currentDate, normalizedPeriod)
    } else if (skipped && consecutiveSkips < MAX_CONSECUTIVE_SKIPS) {
      consecutiveSkips++
      currentDate = getPreviousPeriod(currentDate, normalizedPeriod)
    } else {
      return streak
    }
  }

  logWarn('habit.streak:iteration-limit', { habitId: habit.id, maxIterations: MAX_STREAK_ITERATIONS, ... })
  return streak
}
```

補助関数（同ファイル内、変更しない）:

- `getPeriodKey(date, period, weekStartDay)` (:155-157) — `getPeriodDateRange(...).startKey` を返す
- `getPreviousPeriod(date, period)` (:159-170) — daily は `subDays(d,1)`、weekly は `subWeeks(d,1)`、
  monthly は `subMonths(startOfMonth(d),1)`
- `normalizeHabitSchedule` (:72-82) — 不正な period は `DEFAULT_HABIT_PERIOD` へ、
  frequency は 1 未満・非有限なら 1 へ丸める（いずれも `logWarn` を出す）

依存する外部モジュール（**モックせず本物を使う**こと。純粋関数です）:

- `src/lib/queries/period.ts` の `getPeriodDateRange`
- `src/lib/utils/date.ts` の `normalizeCheckinDate`
- `src/constants/habit.ts` の `DEFAULT_HABIT_PERIOD` / `WeekStartDay`

### 従うべきリポジトリの規約

- **テストの置き場所**: `src/lib/queries/__tests__/` 配下（既に `habit.test.ts` / `checkin.test.ts` / `user.test.ts` がある）
- **テストの書き方の手本**: `src/lib/queries/__tests__/habit.test.ts`。
  ただし当該ファイルは `drizzle-orm` を丸ごとモックしています。**この計画ではモックは不要**です
  （純粋関数のみを対象にするため）。`describe` / `it` / `expect` の書き方と
  日本語の `it` 文言のスタイルだけを参考にしてください。
- **`vi.mock` は使わない**。使う必要が出たら設計を疑ってください（STOP conditions 参照）。
- **オブジェクトキーはアルファベット順**（Biome 規約）
- **型アサーション（`as`）と `any` の新規導入は禁止**（リポジトリ規約）

## Commands you will need

| 目的               | コマンド                            | 成功時の期待 |
| ------------------ | ----------------------------------- | ------------ |
| 型チェック         | `pnpm tsc --noEmit`                 | exit 0       |
| Lint / format      | `pnpm exec biome check --write src` | exit 0       |
| テスト（絞り込み） | `pnpm test:run -- habit-read`       | 全 pass      |
| テスト（全体）     | `pnpm test:run`                     | 全 pass      |

## Scope

**In scope**:

- `src/lib/queries/__tests__/habit-read.test.ts`（新規作成）
- `src/lib/queries/habit-read.ts` — **`calculateStreakFromCheckins` に `export` を付ける 1 行のみ**。
  それ以外の変更は禁止です。

**Out of scope（触らない）**:

- `getHabitsWithProgress`（:180-339）— DB とキャッシュに依存します。この計画では扱いません。
- `src/lib/queries/period.ts` / `src/lib/utils/date.ts` — 本物を使います。変更禁止。
- ストリーク計算ロジックそのもの — **バグに見えても直さない**。報告に書くだけ。
- `MAX_STREAK_ITERATIONS` の値（50000）

## Steps

### Step 1: `calculateStreakFromCheckins` を export する

`src/lib/queries/habit-read.ts:341` の
`function calculateStreakFromCheckins(` を
`export function calculateStreakFromCheckins(` に変更します。**この 1 行だけ**です。

型 `HabitSchedule`（:40-42）もテストから参照するため、必要なら同様に `export` を付けてよい
（`export interface HabitSchedule extends NormalizedHabitSchedule { id: string }`）。
付けない場合は、テスト側でインラインのオブジェクトリテラルを渡してください。

**Verify**:

```bash
pnpm tsc --noEmit && git diff --stat src/lib/queries/habit-read.ts
```

→ exit 0 かつ、変更が 1〜2 行であること

### Step 2: 特性テストのファイルを作り、daily の基本ケースを固定する

`src/lib/queries/__tests__/habit-read.test.ts` を新規作成します。

まず `describe('calculateStreakFromCheckins', ...)` の下に daily / frequency=1 のケースを書きます。
`baseDate` は必ず**固定値**（例: `new Date('2026-03-15T00:00:00Z')`）を渡し、
`new Date()` の既定値には依存させないこと（テストが日付で壊れます）。
`weekStartDay` も明示的に渡します。

書くケース（すべて period: `'daily'`, frequency: 1）:

1. checkins も skips も空 → `0`
2. 基準日を含む 3 日連続のチェックイン → `3`
3. 基準日にはチェックインが無く、前日から 2 日連続 → `2`
   （`currentCount < frequency` のとき 1 期間巻き戻す挙動の固定）
4. 基準日から 2 日連続のあと 1 日空いて、さらに 2 日連続 → `2`（途切れで止まる）
5. 同じ日付のチェックインが 2 件ある（frequency=1）→ 期待値は**実際に動かして観測した値**を書く

**先に期待値を推測して書かないでください。** 各ケースは
「実装を呼ぶ → 実際の戻り値を確認 → その値を期待値として書く」順で作ります。
これが characterization test の作法です。ただし 1〜4 は上記の期待値になるはずなので、
**一致しなかった場合は STOP conditions に該当します**（実装理解と実コードの乖離）。

**Verify**: `pnpm test:run -- habit-read` → 全 pass

### Step 3: frequency > 1 のケースを追加する

period: `'daily'`, frequency: 3 で:

1. 各日 3 件ずつ 2 日連続 → `2`
2. 基準日が 2 件（frequency に届かない）、前日が 3 件 → `1`
3. 各日 5 件（frequency 超過）× 2 日 → `2`（超過しても 1 期間は 1 カウント）

**Verify**: `pnpm test:run -- habit-read` → 全 pass

### Step 4: weekly / monthly と weekStartDay を固定する

1. period `'weekly'`, frequency 1, `weekStartDay: 1`（月曜始まり）で
   直近 3 週にそれぞれ 1 件 → `3`
2. 同じデータで `weekStartDay: 0`（日曜始まり）にすると結果が変わるケースを 1 つ作る。
    **期待値は実際に動かして観測した値**を書き、なぜ変わるかを 1 行コメントで添える
    （週境界の切り替わりで、あるチェックインが別の週に属するようになるため）。
3. period `'monthly'`, frequency 1 で直近 2 か月にそれぞれ 1 件 → `2`
4. period に不正値（例: `'yearly'`）を渡すと `DEFAULT_HABIT_PERIOD`（daily）へフォールバックする。
    frequency に `0` を渡すと 1 として扱われる。この 2 つを 1 ケースずつ。
    `logWarn` が出るがテストは失敗しません（出力が出ることは検証不要）。

**Verify**: `pnpm test:run -- habit-read` → 全 pass

### Step 5: スキップの連続許容（この関数で最も壊れやすい部分）を固定する

`MAX_CONSECUTIVE_SKIPS = 3` の挙動を固定します。period: `'daily'`, frequency: 1 で:

 1. 基準日にチェックイン、前日がスキップ、その前日にチェックイン → 期待値を観測して固定
    （スキップはストリークを**増やさないが途切れさせない**はず）
 2. スキップが 3 日連続してからチェックインがある → 到達できる
 3. スキップが 4 日連続してからチェックインがある → そこで止まる
 4. チェックインが 0 件でスキップのみ 2 件 → 期待値を観測して固定
    （冒頭の早期リターン条件 `habitCheckins.length === 0 && skips.length === 0` は
    偽になるので、ループへ入ります）
 5. 連続スキップのカウンタがチェックイン成功でリセットされること:
    スキップ 2 → チェックイン → スキップ 2 → チェックイン の並びが最後まで到達する

13〜17 は**必ず実際に動かして観測した値**を期待値にしてください。
観測値が直感と食い違う場合も、値はそのまま固定し、
「観測された挙動」として報告に列挙してください（バグかどうかの判断は人間が行います）。

**Verify**: `pnpm test:run -- habit-read` → 全 pass

### Step 6: 全体ゲート

**Verify**:

```bash
pnpm exec biome check --write src && pnpm tsc --noEmit && pnpm test:run
```

→ すべて exit 0。テスト件数が 148 + 新規分になっていること

## Test plan

- 新規ファイル: `src/lib/queries/__tests__/habit-read.test.ts`
- ケース数: 上記 1〜17 の 17 ケース以上
- 構造の手本: `src/lib/queries/__tests__/habit.test.ts`（`describe` / `it` のスタイルのみ）
- モックは使わない。`getPeriodDateRange` / `normalizeCheckinDate` は本物を通す
- すべてのケースで `baseDate` と `weekStartDay` を明示的に渡す

## Done criteria

すべて満たすこと:

- [ ] `pnpm tsc --noEmit` が exit 0
- [ ] `pnpm test:run` が exit 0。`habit-read.test.ts` に 17 ケース以上あり全 pass
- [ ] `grep -c "vi.mock" src/lib/queries/__tests__/habit-read.test.ts` が 0
- [ ] `git diff --stat src/lib/queries/habit-read.ts` の変更行数が 2 行以下（export 追加のみ）
- [ ] すべてのテストで `baseDate` が固定値（`new Date()` を直接渡しているケースが無い）
- [ ] `git status --short` の変更ファイルが In scope のみ
- [ ] 報告に「観測された挙動」の一覧（直感と食い違った点があれば）が含まれている
- [ ] `plans/README.md` の 003 の行の Status を更新（レビュアーが管理すると言われた場合は不要）

## STOP conditions

- 「Current state」の抜粋と実コードが一致しない
- Step 2 のケース 1〜4 が、記載の期待値（0 / 3 / 2 / 2）と一致しない
  → 実装の理解に食い違いがあります。実際の戻り値を添えて報告してください
- テストを通すために `calculateStreakFromCheckins` のロジックを変えたくなった
  → **絶対に変えないこと**。何が問題に見えるかを報告してください
- `vi.mock` が必要になった → 対象関数の切り出し方が誤っています。報告してください
- 同じ検証コマンドが、妥当な修正を 2 回試しても失敗する

## Maintenance notes

- このテストは**仕様書ではなく現状の記録**です。今後ストリーク仕様を意図的に変えるときは、
  該当ケースの期待値を変えたうえで「なぜ変えたか」をコミットメッセージに残してください。
- 計画 004（チェックイン取得を直近 1 年に制限する）は、このテストが緑であることを前提にします。
- レビュー時に見るべき点: `baseDate` が固定されているか、`habit-read.ts` 本体に
  export 以外の変更が入っていないか。
