# Plan 004: ダッシュボードのチェックイン取得を直近 1 年に制限する

> **Executor instructions**: 上から順に実行し、各ステップの検証コマンドと期待結果を確認してから次へ進んでください。
> 「STOP conditions」に該当したら改変を止めて報告します。**コミットはしないでください**。
>
> **前提**: この計画は `plans/003-characterization-tests-for-streak.md` が完了し、
> `src/lib/queries/__tests__/habit-read.test.ts` が存在して緑であることを前提にします。
> 存在しない場合は STOP して報告してください。
>
> **Drift check（最初に実行）**:
> `git diff --stat 88f423b..HEAD -- src/lib/queries/habit-read.ts`
> 計画 003 による `export` 追加以外の変更があれば、下の抜粋と実コードを突き合わせ、
> 一致しなければ STOP。

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/003-characterization-tests-for-streak.md`
- **Category**: perf
- **Planned at**: commit `88f423b`, 2026-08-10

## Why this matters

ダッシュボード表示のたび（KV キャッシュがミスするたび）に、
`getHabitsWithProgress` はそのユーザーの**全期間のチェックインを 1 件残らず** D1 から引いています。
一方、同じ関数の中でスキップ（`habitSkips`）は明示的に「直近 1 年」で絞られています。
チェックインだけ無制限なのは非対称であり、利用年数に比例して転送量・
Workers の CPU 時間・KV へ書き戻すキャッシュのサイズが線形に増え続けます。

このデータの用途は 2 つだけです。(a) 当該期間の進捗カウント、(b) ストリーク計算。
どちらも「直近 1 年」で足ります（スキップ側が既に 1 年で切られているため、
それより古いストリークは現状でも正しく延伸できません）。
この計画では、スキップと同じ 1 年の下限をチェックインにも適用します。

## Current state

対象ファイル:

- `src/lib/queries/habit-read.ts` — `getHabitsWithProgress` の並列クエリ部分。

### `src/lib/queries/habit-read.ts:215-242`（現状。問題箇所）

```ts
const queryStart = nowMs();

const streakLimitDate = new Date(baseDate);
streakLimitDate.setFullYear(streakLimitDate.getFullYear() - 1);
const streakLimitDateKey = formatDateKey(streakLimitDate);

// habits / checkins / skips / weekStart は独立したクエリのため1段のPromise.allで並列取得する
// checkins・skips は habits へのJOINで userId + archived 起点にフィルタし、habitIds経由のinArrayを不要にする
const habitListPromise = getHabitsByUserId(userId);
const allCheckinsPromise: Promise<(typeof checkins.$inferSelect)[]> = db
  .select(getTableColumns(checkins))
  .from(checkins)
  .innerJoin(habits, eq(checkins.habitId, habits.id))
  .where(and(eq(habits.userId, userId), eq(habits.archived, false)))
  .orderBy(checkins.habitId, desc(checkins.date), desc(checkins.createdAt));
const allSkipsPromise: Promise<(typeof habitSkips.$inferSelect)[]> = db
  .select(getTableColumns(habitSkips))
  .from(habitSkips)
  .innerJoin(habits, eq(habitSkips.habitId, habits.id))
  .where(
    and(
      eq(habits.userId, userId),
      eq(habits.archived, false),
      gte(habitSkips.date, streakLimitDateKey),
    ),
  );

const [habitList, allCheckins, allSkips, weekStartStr] = await Promise.all([
  habitListPromise,
  allCheckinsPromise,
  allSkipsPromise,
  weekStartPromise,
]);
```

`streakLimitDateKey` は既に計算済みで、skips 側の `gte(habitSkips.date, streakLimitDateKey)` で
使われています。checkins 側の `.where(...)` にだけ同じ条件がありません。

### `allCheckins` の 2 つの用途（:265-311）

```ts
const habitCheckins = checkinsByHabit.get(habit.id) ?? [];
// (a) 当該期間の進捗カウント
const { start, end } = getPeriodDateRange(
  baseDate,
  normalizedPeriod,
  weekStartDay,
);
const currentProgress = habitCheckins.filter((checkin) => {
  const checkinDate = normalizeCheckinDate(checkin.date);
  return checkinDate >= start && checkinDate <= end;
}).length;
// (b) ストリーク計算
const streak = calculateStreakFromCheckins(
  { frequency: normalizedFrequency, id: habit.id, period: normalizedPeriod },
  habitCheckins,
  weekStartDay,
  baseDate,
  habitSkipList,
);
```

### 型と日付キーの規約

- `checkins.date` / `habitSkips.date` は SQLite の TEXT カラムで、
  `YYYY-MM-DD` 形式の**日付キー文字列**です（`src/lib/utils/date.ts` の `formatDateKey` / `normalizeDateKey`）。
  文字列比較で日付の大小比較が成立する前提のフォーマットです。
- `drizzle-orm` の `gte(column, value)` は既に import 済み（:2）。追加 import は不要なはずです。
- **オブジェクトキーはアルファベット順**（Biome 規約）
- **型アサーション（`as`）と `any` の新規導入は禁止**

## Commands you will need

| 目的               | コマンド                            | 成功時の期待 |
| ------------------ | ----------------------------------- | ------------ |
| 型チェック         | `pnpm tsc --noEmit`                 | exit 0       |
| Lint / format      | `pnpm exec biome check --write src` | exit 0       |
| テスト（絞り込み） | `pnpm test:run -- habit-read`       | 全 pass      |
| テスト（全体）     | `pnpm test:run`                     | 全 pass      |

## Scope

**In scope**:

- `src/lib/queries/habit-read.ts`

**Out of scope（触らない）**:

- `src/lib/cache/habit-cache.ts` — TTL やキャッシュ構造は変えません。
- `src/lib/queries/checkin.ts` — チェックイン作成・削除側のクエリは無関係です。
- `src/lib/queries/habit-calendar.ts` — カレンダーヒートマップは別のクエリ経路です。
  こちらの取得範囲は**この計画では変えません**。
- `calculateStreakFromCheckins` のロジック — 入力データ量を変えるだけで、計算は変えません。
- `src/lib/queries/__tests__/habit-read.test.ts` — 計画 003 が作った特性テスト。
  **期待値を書き換えてはいけません**（書き換えたくなったら STOP）。

## Steps

### Step 0: 前提の確認

```bash
test -f src/lib/queries/__tests__/habit-read.test.ts && pnpm test:run -- habit-read
```

→ ファイルが存在し、全 pass すること。どちらか失敗したら STOP。

### Step 1: 制限の意図を表す定数に名前を付ける

`src/lib/queries/habit-read.ts` の既存の
`streakLimitDate` / `streakLimitDateKey`（:217-219）は「ストリーク遡行の下限」という意味です。
チェックインにも同じ下限を使うため、この変数を**そのまま流用**します。新しい定数は作りません。

ただし、コメント（:221-222）を更新して「checkins も同じ下限で絞る」ことと
**その理由**（進捗カウントとストリーク計算のどちらも 1 年分で足り、
スキップ側の下限と揃えないと非対称になるため）を 1〜2 行で残してください。
リポジトリの規約上、コメントは「コードから読み取れない判断理由」だけを書きます。

**Verify**: `pnpm tsc --noEmit` → exit 0

### Step 2: checkins クエリに下限を追加する

`allCheckinsPromise` の `.where(...)` を次の形に変更します。

```ts
      .where(
        and(
          eq(habits.userId, userId),
          eq(habits.archived, false),
          gte(checkins.date, streakLimitDateKey)
        )
      )
```

`.orderBy(...)` はそのまま維持してください（`calculateStreakFromCheckins` は順序に依存しませんが、
`checkinsByHabit` のグルーピング結果の並びが変わると、
将来デバッグ時に読み取りづらくなるため既存の並びを保ちます）。

**Verify**:

```bash
pnpm tsc --noEmit && pnpm test:run
```

→ どちらも exit 0。**計画 003 の特性テストが 1 件も落ちないこと**

### Step 3: 進捗カウントが範囲外日付で壊れないことを確認する

`currentProgress`（:278-281）は `baseDate` を基準にした「今の期間」のチェックイン数です。
`baseDate` が今日である限り、1 年の下限に引っかかることはありません。

ただし `getHabitsWithProgress` は `date` 引数を受け取れる設計です（:183）。
呼び出し元を確認してください:

```bash
grep -rn "getHabitsWithProgress" src --include=*.ts --include=*.tsx
```

**1 年以上前の日付を渡している呼び出し元が 1 つでもあれば STOP** して報告してください
（その経路では進捗が 0 になる回帰が起きます）。
すべての呼び出し元が「今日」または直近日付を渡しているなら、そのまま進みます。
確認結果（呼び出し元の一覧と、それぞれが渡している日付）を報告に含めてください。

### Step 4: 下限の境界に関するテストを 1 件足す

`src/lib/queries/__tests__/habit-read.test.ts` に追記します
（**既存ケースの期待値は変更しない**。追記のみ）。

`calculateStreakFromCheckins` に「1 年以上前のチェックインを渡さなかった場合でも、
直近のストリークは同じ値になる」ことを示すケースを 1 件書きます。具体的には:

- period `'daily'`, frequency 1
- ケース A: 基準日から 3 日連続のチェックイン **＋ 2 年前のチェックイン 1 件** を渡す
- ケース B: 基準日から 3 日連続のチェックインのみを渡す
- A と B の戻り値が**等しい**ことを assert する

これがこの計画の回帰テストです（古いデータを落としても結果が変わらないことの証明）。

**Verify**: `pnpm test:run -- habit-read` → 全 pass（既存ケース + 新規 1 件）

### Step 5: 全体ゲート

**Verify**:

```bash
pnpm exec biome check --write src && pnpm tsc --noEmit && pnpm test:run
```

→ すべて exit 0

## Test plan

- 既存: 計画 003 の特性テストが**全件そのまま緑**であること（これが主要な安全網）
- 新規: Step 4 の「1 年より古いデータの有無で結果が変わらない」ケース 1 件
- 実 DB を使った検証はこの計画の範囲外です（計画 005 が別途扱います）

## Done criteria

すべて満たすこと:

- [ ] `pnpm tsc --noEmit` が exit 0
- [ ] `pnpm test:run` が exit 0。計画 003 の既存ケースが 1 件も落ちていない
- [ ] `grep -n "gte(checkins.date, streakLimitDateKey)" src/lib/queries/habit-read.ts` が 1 件以上
- [ ] `git diff src/lib/queries/__tests__/habit-read.test.ts` が**追記のみ**（既存行の変更・削除が無い）
- [ ] Step 3 の呼び出し元一覧が報告に含まれている
- [ ] `git status --short` の変更ファイルが `src/lib/queries/habit-read.ts` と
      `src/lib/queries/__tests__/habit-read.test.ts` のみ
- [ ] `plans/README.md` の 004 の行の Status を更新（レビュアーが管理すると言われた場合は不要）

## STOP conditions

- `src/lib/queries/__tests__/habit-read.test.ts` が存在しない、または最初から赤
- 計画 003 の特性テストが 1 件でも落ちた
  → **期待値を書き換えて緑にしないこと**。落ちたケースと差分を添えて報告してください
- Step 3 で、1 年以上前の日付を渡している `getHabitsWithProgress` の呼び出し元が見つかった
- 「Current state」の抜粋と実コードが一致しない
- 同じ検証コマンドが、妥当な修正を 2 回試しても失敗する

## Maintenance notes

- **1 年という上限が意味すること**: 1 年以上前から途切れず続いているストリークは、
  1 年で頭打ちになります。現状もスキップ側が 1 年で切られているため実質同じですが、
  この変更で「1 年」がチェックイン側にも明文化されます。
  将来「生涯ストリーク」を見せたくなったら、この下限ではなく
  集計済みカラム（habits に streak を持たせる等）で解くべきです。
- レビュー時に見るべき点: `streakLimitDateKey` が checkins と skips の**両方**に
  適用されているか、特性テストの期待値が書き換えられていないか。
- **意図的に範囲外にしたもの**: `habit-calendar.ts` の取得範囲、KV キャッシュの TTL 見直し。
