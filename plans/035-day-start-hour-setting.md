# Plan 035: 日付が切り替わる時刻をユーザー設定にする（24〜29 時）

> **Executor instructions**: この plan を順に実施し、検証をすべて実行する。STOP 条件に当たったら停止して報告する。
>
> **Drift check**: `git diff --stat c449dde..HEAD -- src/db/schema.ts src/schemas/ src/lib/server/date.ts src/lib/utils/date.ts src/lib/queries/user-settings.ts src/validators/habit-action.ts src/hooks/useHabitCheckinQueue.ts public/sw.js`

## Status

- **Priority**: P2
- **Effort**: L（初案の M から上方修正。理由は「改訂の経緯」）
- **Risk**: MED-HIGH（永続データ構造 + 書き込み経路の契約 + 日付境界という全体に効く挙動）
- **Depends on**: none
- **Category**: feature
- **Planned at**: commit `c449dde`, 2026-09-02
- **Revised at**: 2026-09-02（独立レビューで初案が NEEDS_REWORK。全面改訂）
- **Tracks**: Linear JEY-638

## 改訂の経緯（初案が壊れていた理由）

初案は「`getServerDateKey` が日付境界の単一集約点だから、そこにオフセットを入れれば全体へ効く」としていた。
これは**書き込み経路で成立しない**。

- クライアントが online / offline / skip の全経路で `formatDateKey(new Date())`（ブラウザの暦日）を
  **明示 `dateKey` として送信**する（`src/hooks/useHabitCheckinQueue.ts`）
- `src/validators/habit-action.ts:63-83` は、`input.dateKey` が渡され許容ウィンドウ内なら
  **サーバー算出の `todayKey` ではなくクライアントの値を採用**する
- 同じ経路が `public/sw.js` のオフライン replay と `src/app/api/checkin/route.ts` にもある

つまり初案のままでは、26 時設定で 1:30 にチェックインしてもクライアントが翌暦日を送るため翌日として記録され、
**本機能の目的が主要経路で無効**になる。

クライアントが `dateKey` を送るのには理由がある。**オフライン replay** で「23:50 に offline で打った操作を
00:10 に送信する」場合、操作時刻の日付へ帰属させる必要があるため。

### なぜクライアント側にオフセットを配る案を採らないか

「クライアントにも `dayStartHour` を渡して同じ計算をさせる」案は**採らない**。
クライアント側の設定は localStorage 由来で**端末ごと**になる（`src/hooks/use-week-start.ts` と同じ構造）。
実測でアクセントカラーがデスクトップと iPhone で異なっていた事例があり、同じ仕組みでは
**日付境界が端末ごとに変わる**。同じ 1:00 のチェックインが端末によって別の日に入るのは、
データ帰属の設定として許容できない。

**したがって日付境界の決定はサーバーに一本化する。**

## 方針

**クライアントは「いつ操作したか」を送り、サーバーが「どの日か」を決める。**

既にオフライン キュー（IndexedDB）へ積まれた項目との後方互換を壊さないため、**加算的に導入**する。

1. クライアントは `occurredAt`（ISO8601 の操作時刻）を送る。**既存の `dateKey` 送信は残す**
2. サーバーは `occurredAt` があれば「`occurredAt` + タイムゾーン + `dayStartHour`」から `dateKey` を導出し、
   無ければ従来どおり受け取った `dateKey` を使う（後方互換）
3. これにより IndexedDB のスキーマ移行が不要で、積まれた古い項目もそのまま replay できる

`dayStartHour` はサーバーが DB から読む。ただし **`getServerDateKey` に DB 参照を足さない**
（本番 D1 は 1 クエリ = 1 往復で、hot path から呼ばれる）。`weekStart` と同型の複製構造に乗せる。

## 調査で確定した事実

- **`getServerDateKey` の呼び出しは 5 ファイル 5 箇所**（`reset.ts:15` / `habits/utils.ts:141` /
  `habits/page.tsx:56` / `dashboard/page.tsx:38` / `analytics/page.tsx:61`）。初案の「9 ファイル」は誤り
  （import を含むファイル数をテスト込みで数えていた）
- **そのうち 4 箇所は user 取得より前に実行している**
- **`weekStart` は `users`（`src/db/schema.ts:34`）と `userSettings`（`:64`）の両方に複製**され、
  更新時に two-phase write + rollback + `invalidateUserCache` で同期している。
  `user` 経由で渡せるのはこの複製があるから
- **過去データは遡って変わらない**: `Checkin.date` は `YYYY-MM-DD` で確定保存（`schema.ts:126`）
- **制約衝突は起きない**: `Checkin` に `(habitId, date)` の UNIQUE は無く index のみ（`schema.ts:136-138`）
- **マイグレーションは安全**: `integer .default(24).notNull()` の ADD COLUMN は SQLite で既存行に定数 default が入る
- 許容ウィンドウ `DATE_KEY_WINDOW_DAYS = { future: 1, past: 365 }`（`habit-action.ts:12`）の
  `future: 1` は「クライアント・サーバー間のクロックスキューを許容するため」とコメントされている

## Scope

**In scope**:

- `src/constants/habit.ts` — `DayStartHour` 型（`24 | 25 | 26 | 27 | 28 | 29`）、`DEFAULT_DAY_START_HOUR = 24`、選択肢定義、`isDayStartHour`
- `src/db/schema.ts` — **`users` と `userSettings` の両方**に `dayStartHour` 列（integer、default 24、notNull）
- `drizzle/` — 生成したマイグレーション
- `src/schemas/user.ts` — Valibot スキーマへ `dayStartHour` を追加
- `src/lib/utils/date.ts` — オフセットを考慮した dateKey 算出（純関数）
- `src/lib/server/date.ts` — `getServerDateKey` が `dayStartHour` を受け取る
- `getServerDateKey` の呼び出し元 5 箇所
- `src/lib/queries/user-settings.ts` — `weekStart` と同型の dual-write と `invalidateUserCache`
- `src/app/actions/settings/` — 更新 action
- `src/validators/habit-action.ts` — `occurredAt` からの dateKey 導出
- `src/app/actions/habits/` — action シグネチャへ `occurredAt` を加算
- `src/app/api/checkin/route.ts` と `CheckinRequestSchema` — `occurredAt` を optional で受ける
- `src/hooks/useHabitCheckinQueue.ts` — `occurredAt` を送る
- `src/lib/pwa/offline-queue.ts` と `public/sw.js` — キュー項目に `occurredAt` を optional で持たせ replay で送る
- `src/hooks/` — client hook（表示用）
- `src/components/settings/DayStartHourSettings.tsx`（新規）と設定ページへの追加
- 表示ラベルと heatmap の today 判定
- 上記のテスト

**Out of scope**:

- 過去の `Checkin.date` の再計算・移行
- クライアント側での dateKey 算出そのものの撤去（後方互換のため残す）
- IndexedDB のスキーマバージョン変更（optional 追加のみ）
- タイムゾーン設定の変更（`ko_tz` cookie の仕組みは維持）
- SW の鮮度上限（`plans/034`）の変更

## Steps

### Step 1: 定数と型

`src/constants/habit.ts` に `WeekStart` の定義様式に倣って追加する。

```ts
export type DayStartHour = 24 | 25 | 26 | 27 | 28 | 29
export const DEFAULT_DAY_START_HOUR: DayStartHour = 24
export const DAY_START_HOURS: readonly DayStartHour[] = [24, 25, 26, 27, 28, 29]
export function isDayStartHour(value: number): value is DayStartHour
```

### Step 2: 純関数としてのオフセット計算

`src/lib/utils/date.ts` に追加する。**日付境界の計算はこの 1 関数だけに置く。**

- 入力は「instant（`Date`）・タイムゾーン（任意）・`dayStartHour`」
- **`dayStartHour - 24` 時間を減算した instant** に対して、既存のタイムゾーン処理
  （`getDateKeyInTimeZone`、失敗時 `formatDateKey`）を適用する
- `dayStartHour = 24` のとき現行と**完全に同じ結果**になること

### Step 3: スキーマとマイグレーション（dual-write の土台）

`users` と `userSettings` の**両方**に `dayStartHour` 列を追加する。`weekStart` 列の定義様式に合わせる。

- 型は integer、`.default(24).notNull()`
- `src/schemas/user.ts` の Valibot スキーマへ `dayStartHour` を追加（user-cache のパースが通るように）
- マイグレーション生成は `node_modules/.bin/drizzle-kit` を直接使う。**D1 への適用はしない**（CI が行う）

生成された SQL をそのまま報告に貼ること。

### Step 4: クエリの dual-write

`src/lib/queries/user-settings.ts` で、`weekStart` の更新処理（`updateWeekStartAndCache` の
two-phase write + rollback + キャッシュ無効化）と**同型**に `dayStartHour` を実装する。

- `users` と `userSettings` の両方を更新し、片方の失敗で整合が崩れないようにする
- `invalidateUserCache(externalId)` に加え、`plans/018` で入れた `invalidateHabitsCache(userId)` /
  `invalidateAnalyticsCache(userId)` も呼ぶ（日付境界が動けば `habits:user:{userId}` の `dateKey` 前提が変わる）
- キャッシュ無効化の失敗は非致命のまま

### Step 5: `getServerDateKey` と呼び出し元

`getServerDateKey({ dayStartHour, date?, cookieKey? })` として `dayStartHour` を受け取り、Step 2 の関数を使う。

**呼び出し元の並べ替え方針**（初案で worker に判断が残っていた点をここで確定する）:

- **`user` を取得した後に `todayKey` を算出する順序へ並べ替える**。`getCurrentUserId` と `syncUser` の
  二重呼び出しを増やさないこと
- `habits/utils.ts:141`（`runHabitMutation`）と `reset.ts:15` は認証前に算出しているので、認証後へ移す
- `dashboard/page.tsx:38` と `habits/page.tsx:56` は `Promise.all` で `syncUser` と並列に実行しているので、
  `syncUser` の結果を待ってから算出する形へ変える
- **並べ替えで DB 往復が増える設計になった場合は BLOCKED を送る**

### Step 6: 書き込み経路に `occurredAt` を通す

**加算的に導入する。既存の `dateKey` 引数・フィールドは削除しない。**

1. `src/validators/habit-action.ts` — 入力に `occurredAt`（optional）を追加。
   **`occurredAt` があればそれと `dayStartHour` から `dateKey` を導出し、その値を採用する**。
   無ければ従来どおり `input.dateKey` → `todayKey` の順で解決する。
   許容ウィンドウの検査は**導出後の `dateKey`** に対して行う
2. `src/app/actions/habits/` の action — `occurredAt` を optional 引数として受け、validator へ渡す
3. `src/app/api/checkin/route.ts` と `CheckinRequestSchema` — `occurredAt` を optional で受ける
4. `src/hooks/useHabitCheckinQueue.ts` — `occurredAt` に操作時刻（`new Date().toISOString()`）を入れて送る
5. `src/lib/pwa/offline-queue.ts` と `public/sw.js` — キュー項目に `occurredAt` を optional で持たせ、
   replay で送る。**IndexedDB のスキーマバージョンは変えない**（optional 追加なので既存項目は読める）

### Step 7: 表示の「今日」を記録先と一致させる

初案で「最悪の壊れ方」と書いたズレを塞ぐ。

- ページの「今日」ラベル（`formatDateLabel(now, timeZone)` を使っている箇所）を、
  **Step 5 で算出した `dateKey` 由来**に揃える
- `src/components/habits/HabitCalendarHeatmap.tsx` の today 判定は client の `new Date()` 由来なので、
  **サーバーから渡された `dateKey` を使う**形へ変える

**この Step を飛ばしてはならない。** 記録先と表示がズレた状態は、設定が無い状態より悪い。

### Step 8: 設定 UI

`src/components/settings/DayStartHourSettings.tsx` を新規作成する。
**`WeekStartSettings.tsx` の構造・クラス・Skeleton・トースト文言の様式をそのまま踏襲する。**

- `RadioGroup` で 6 択
- ラベルは `24時（0:00）` `25時（1:00）` … `29時（5:00）` のように**両表記を併記**
- 説明は「この時刻までは前日として記録します」の主旨。24 時のみ「暦どおりに切り替えます」
- 設定ページへ `WeekStartSettings` の隣に追加する

### Step 9: テスト

- Step 2 の純関数: `dayStartHour = 24` で現行と同一、26 で `9/2 01:30 → 9/1` /
  `9/2 02:00 → 9/2`（境界そのもの）、29 で `9/2 04:59 → 9/1` / `9/2 05:00 → 9/2`
- タイムゾーン併用時にオフセットが正しく効くこと
- **DST 切替日**（`America/New_York` 等）の挙動を仕様としてテストで固定する
- `occurredAt` があるときは `dateKey` より優先されること、無いときは従来どおりであること
- **境界直後に client の `dateKey` と server 導出値が割れるケース**が許容ウィンドウで弾かれないこと
- 更新 action と dual-write のテスト

**テストは振る舞いの契約だけを検証する。呼び出し回数（`toHaveBeenCalledTimes`）、順序
（`toHaveBeenNthCalledWith`）、CSS クラス（`toHaveClass`）は固定しない。**

## Verify

| 目的 | コマンド | 期待 |
| --- | --- | --- |
| Lint | `node_modules/.bin/biome check --write <触ったファイル>` | exit 0 |
| 型 | `node_modules/.bin/tsc --noEmit` | exit 0 |
| テストの型 | `node_modules/.bin/tsc --project tsconfig.test.json --noEmit` | exit 0 |
| テスト | `node_modules/.bin/vitest run src/lib src/app/actions src/validators src/hooks` | all pass |
| 空白混入 | `git diff --check` | exit 0 |

報告に含めること。

- 生成されたマイグレーション SQL の全文
- `getServerDateKey` の呼び出し元 5 箇所を**どう並べ替えたか**の一覧
- `dayStartHour = 24` で現行と完全に同じ dateKey になることを示すテスト
- `occurredAt` が無い古いキュー項目が従来どおり replay できることを示すテスト
- `git status --short --untracked-files=all`

orchestrator が full gate（`lefthook run pre-push`）と本番デプロイ後の D1 マイグレーション適用を確認する。

## STOP conditions

- Step 5 の並べ替えで DB 往復が増える設計になった場合
- `occurredAt` の加算だけでは後方互換が保てず IndexedDB のスキーマ変更が必要になった場合
- 日付境界の計算が Step 2 の 1 関数に収まらない設計になった場合
- マイグレーションが既存データの移行判断を必要とする場合
- 依存3ファイル（`package.json` の dependencies / `pnpm-lock.yaml` / `pnpm-workspace.yaml`）の変更が必要になった場合
- 同一根本原因で 3 回失敗した場合

## 関連

- Linear JEY-638（改訂の経緯とレビュー findings は issue のコメントに記録済み）
- `plans/018` — weekStart 変更時のキャッシュ無効化。本 plan も同じ無効化に乗る
- `plans/034` — SW ナビゲーションの鮮度上限。交点はオフライン replay の dateKey のみ
- `.claude/rules/caching-strategy.md` — `habits:user:{userId}` の `dateKey` バージョン管理
