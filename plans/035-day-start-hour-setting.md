# Plan 035: 日付が切り替わる時刻をユーザー設定にする（24〜29 時）

> **Executor instructions**: この plan を順に実施し、検証をすべて実行する。STOP 条件に当たったら停止して報告する。
>
> **Drift check**: `git diff --stat e78bade..HEAD -- src/db/schema.ts src/lib/server/date.ts src/lib/utils/date.ts src/lib/queries/user-settings.ts src/constants/habit.ts`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED（永続データ構造の変更 + 日付境界という全体に効く挙動）
- **Depends on**: none
- **Category**: feature
- **Planned at**: commit `e78bade`, 2026-09-02
- **Tracks**: Linear JEY-638

## Why this matters

チェックインの所属日が暦上の 0 時で切り替わるため、夜型のユーザーが 1 時にチェックインすると翌日の記録になり、
主観的には同じ 1 日の続きなのにストリークが途切れる。

**繰り越し時刻を 24〜29 時（0 時〜朝 5 時）の 1 時間刻み・6 択**にする。既定は 24 時で既存挙動を変えない。

上限を 29 時にするのは、それ以上だと**朝の習慣が前日に記録され始める**ため（6 時始まりでは「朝 6 時のランニング」が
昨日の分になる）。分刻みの連続ピッカーにはしない。

## 調査で確定した事実

- **日付境界の単一集約点がある**: `getServerDateKey()`（`src/lib/server/date.ts`）。参照は 9 ファイルすべてこれ経由
- **過去データは遡って変わらない**: `Checkin.date` は `YYYY-MM-DD` の文字列で確定保存（`src/db/schema.ts:126`）
- **制約衝突は起きない**: `Checkin` に `(habitId, date)` の UNIQUE は無く index のみ（`schema.ts:136-138`）。
  同日複数チェックインが前提の設計
- **既存の類似設定 `weekStart` は `user` オブジェクト経由でサーバへ渡っている**:
  `getHabitsWithProgress(user.id, user.externalId, dateKey, user.weekStart, ...)`
  （`dashboard/page.tsx:57`、`analytics/page.tsx:73`、`habits/page.tsx:78`）

## 方針

**`getServerDateKey` に DB 参照を追加してはならない。** 本リポジトリでは「本番 D1 は 1 クエリ = 1 往復、
直列クエリが連打詰まりの原因」という実測知見があり、`getServerDateKey` は
`runHabitMutation`（`src/app/actions/habits/utils.ts:141`）などの hot path から呼ばれる。

代わりに **`weekStart` と同じ経路**に乗せる。既に読み込み済みの `user` から値を渡し、
`getServerDateKey` は受け取った値で計算するだけにする。DB 往復は増えない。

```text
getServerDateKey({ dayStartHour }) で受け取り、
チェックイン時刻から dayStartHour - 24 時間を引いた結果の日付を dateKey とする
（dayStartHour=26 なら 2 時間引く。9/2 01:30 → 9/1）
```

**`dayStartHour` は必須パラメータにする。** 省略可能にすると渡し忘れた呼び出し元が黙って 24 時扱いになり、
「記録先と表示のズレ」という最悪の壊れ方をする。必須にすれば型検査が全 9 箇所を強制的に洗い出す。

## Scope

**In scope**:

- `src/constants/habit.ts` — `DayStartHour` 型（`24 | 25 | 26 | 27 | 28 | 29`）、`DEFAULT_DAY_START_HOUR = 24`、選択肢定義
- `src/db/schema.ts` — `userSettings` に `dayStartHour` 列（integer、default 24、notNull）
- `drizzle/` — 生成したマイグレーション
- `src/lib/utils/date.ts` — オフセットを考慮した dateKey 算出
- `src/lib/server/date.ts` — `getServerDateKey` が `dayStartHour` を必須で受け取る
- `getServerDateKey` の全呼び出し元（型検査で洗い出すこと）
- `src/lib/queries/user-settings.ts` — 読み書き
- `src/app/actions/settings/` — 更新 action（`updateWeekStart.ts` に倣う）
- `src/hooks/` — client hook（`use-week-start.ts` に倣う）
- `src/components/settings/DayStartHourSettings.tsx`（新規、`WeekStartSettings.tsx` に倣う）と設定ページへの追加
- 上記のテスト

**Out of scope**:

- 過去の `Checkin.date` の再計算・移行
- タイムゾーン設定そのものの変更（`ko_tz` cookie の仕組みは維持）
- SW の鮮度上限（`plans/034`）の変更
- 分単位の粒度

## Steps

### Step 1: 定数と型

`src/constants/habit.ts` に `WeekStart` の定義に倣って追加する。

```ts
export type DayStartHour = 24 | 25 | 26 | 27 | 28 | 29
export const DEFAULT_DAY_START_HOUR: DayStartHour = 24
export const DAY_START_HOURS: readonly DayStartHour[] = [24, 25, 26, 27, 28, 29]
export function isDayStartHour(value: number): value is DayStartHour
```

### Step 2: スキーマとマイグレーション

`userSettings` に列を追加する。`weekStart` 列の定義様式に合わせること。

- 型は integer、`.default(24).notNull()`
- Drizzle のマイグレーション生成コマンドはリポジトリの `package.json` scripts を確認して使う
- **既存行に 24 が入ることを SQL で確認する**（`ALTER TABLE ... DEFAULT` の挙動）

生成された SQL をそのまま報告に貼ること。

### Step 3: dateKey の算出にオフセットを入れる

`src/lib/utils/date.ts` にオフセット対応の関数を追加し、`src/lib/server/date.ts` の
`getServerDateKey` から使う。

- `getServerDateKey({ dayStartHour, date?, cookieKey? })` として **`dayStartHour` を必須**にする
- 既存のタイムゾーン処理（`ko_tz` cookie → `getDateKeyInTimeZone`、失敗時 `formatDateKey`）は維持し、
  **オフセット適用後の時刻**に対して従来どおり適用する
- **オフセットは `dayStartHour - 24` 時間の減算**。24 なら 0 で現行と完全に同じ結果になること

**この関数以外に日付境界のロジックを作らない。** 表示用の「今日」も同じ関数を経由させる。

### Step 4: 呼び出し元を通す

`node_modules/.bin/tsc --noEmit` を実行し、`dayStartHour` 必須化で落ちた全箇所を洗い出す。
各呼び出し元で、既に読み込み済みの `user` から値を渡す（`weekStart` と同じ経路）。

**user を持たない呼び出し元があった場合は BLOCKED を送って停止する。** その箇所の設計判断は plan の範囲外。

### Step 5: クエリと action

- `src/lib/queries/user-settings.ts` — `dayStartHour` の読み書きを追加。
  **weekStart 変更時と同じくキャッシュ無効化を行う**（日付境界が動けば `habits:user:{userId}` の
  `dateKey` 前提が変わるため）。`plans/018` で入れた `invalidateHabitsCache` / `invalidateAnalyticsCache` の
  呼び出しに合わせる
- `src/app/actions/settings/` — 更新 action を `updateWeekStart.ts` に倣って作る。
  成功時の `revalidatePath` は `plans/018` で拡張した4パスに合わせる

### Step 6: 設定 UI

`src/components/settings/DayStartHourSettings.tsx` を新規作成する。
**`WeekStartSettings.tsx` の構造・クラス・スケルトン・トースト文言の様式をそのまま踏襲すること。**

- `RadioGroup` で 6 択
- ラベルは `24時（0:00）` `25時（1:00）` … `29時（5:00）` のように**両表記を併記**する
- 説明文は「この時刻までは前日として記録します」の主旨。24 時のみ「暦どおりに切り替えます」
- 設定ページへ `WeekStartSettings` の隣に追加する

### Step 7: テスト

- `src/lib/utils/date.ts` のオフセット算出: 24 で現行と同一、26 で `9/2 01:30 → 9/1`、
  `9/2 02:00 → 9/2`（境界そのもの）、29 で `9/2 04:59 → 9/1` / `9/2 05:00 → 9/2`
- タイムゾーン併用時にオフセットが正しく効くこと
- 更新 action のテスト（`updateWeekStart` のテストに倣う）

**テストは振る舞いの契約だけを検証する。呼び出し回数（`toHaveBeenCalledTimes`）、順序
（`toHaveBeenNthCalledWith`）、CSS クラス（`toHaveClass`）は固定しない。**

## Verify

| 目的 | コマンド | 期待 |
| --- | --- | --- |
| Lint | `node_modules/.bin/biome check --write <触ったファイル>` | exit 0 |
| 型 | `node_modules/.bin/tsc --noEmit` | exit 0 |
| テストの型 | `node_modules/.bin/tsc --project tsconfig.test.json --noEmit` | exit 0 |
| テスト | `node_modules/.bin/vitest run src/lib/utils src/lib/server src/app/actions/settings` | all pass |
| 空白混入 | `git diff --check` | exit 0 |

報告に含めること。

- 生成されたマイグレーション SQL の全文
- `getServerDateKey` の呼び出し元を型検査でどう洗い出し、それぞれ何を渡したかの一覧
- `dayStartHour = 24` で現行と完全に同じ dateKey になることを示すテスト

orchestrator が full gate（`lefthook run pre-push`）と本番デプロイ後の D1 マイグレーション適用を確認する。

## STOP conditions

- `getServerDateKey` の呼び出し元に `user` を持たないものがあった場合
- マイグレーションが既存データの移行判断を必要とする場合
- `getServerDateKey` 以外に日付境界のロジックを作らないと成立しない設計になった場合
- 依存3ファイル（`package.json` の dependencies / `pnpm-lock.yaml` / `pnpm-workspace.yaml`）の変更が必要になった場合

## 関連

- Linear JEY-638
- `plans/018` — weekStart 変更時のキャッシュ無効化。本 plan も同じ無効化に乗る
- `plans/034` — SW ナビゲーションの鮮度上限。「深夜跨ぎの残存窓」の位置が本設定で動く
- `.claude/rules/caching-strategy.md` — `habits:user:{userId}` の `dateKey` バージョン管理
