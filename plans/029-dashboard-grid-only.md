# 029 ダッシュボードを円グリッド専用にする

## 背景と決定

`/dashboard` には「円グリッド」と「リスト」という同じチェックイン機能の完成形が 2 つあり、ページ内トグルとモバイルタブバーの slot でそれを切り替えていた。ユーザーとの設計合意により、以下を確定した。

- `/dashboard` は**円グリッド専用**にし、ビュー切替を全廃する
- `/dashboard` に出す習慣は**今日アクションが必要なものだけ**に絞る
- リストビューは `/habits` へ移し、そこが**全習慣の台帳**になる（別計画 030）
- タブ構成は 4 つのまま。ラベル「ダッシュボード」を「今日」に変える
- 「アーカイブ / 復元」という語彙は変えない

役割分担: `/dashboard` は今日やる分の没入的なチェックイン、`/habits` は全習慣の一覧・絞り込み・管理。チェックイン操作は両方にあってよいが、**見えている母集団が違う**ことが両者の境界線である。

## この計画の担当範囲

`/dashboard` 側のみ。`/habits` と `src/components/habits/` には一切触らない（計画 030 の担当）。

## やること

### 1. ビュー切替の全廃

- `src/constants/dashboard.ts`: `DashboardView` 型、`DASHBOARD_VIEW_COOKIE_KEY`、`DEFAULT_DASHBOARD_VIEW` を削除する。`MAX_CONCURRENT_CHECKINS` は残す
- `src/components/streak/types.ts`: `DashboardViewProps` から `currentView` / `onViewChange` を削除する
- `src/app/(dashboard)/dashboard/page.tsx`: cookie 読み出しと `initialView` の受け渡しを削除する
- `src/app/(dashboard)/dashboard/DashboardWrapper.tsx`: `initialView` prop、`currentView` state、`handleViewChange`、cookie 書き込みを削除し、`StreakDashboard` / `DesktopDashboard` への該当 prop を外す
- `src/components/streak/StreakDashboard.tsx`: 三項分岐をなくし `HabitSimpleView` のみを描画する。`useMobileTabBarSlot` の登録と切替ボタンの JSX を削除する。`useEffect` による `--dashboard-bg` / `html` / `body` の背景塗りは**そのまま残す**（コメントに書かれている iOS standalone の実測理由が現在も有効）
- `src/components/streak/DesktopDashboard.tsx`: 三項分岐と右下のフローティング `DashboardViewToggle` を削除し、`HabitSimpleView` のみを描画する
- `src/components/streak/DashboardViewToggle.tsx` を削除する
- `src/components/streak/useDashboardContent.ts`: `filteredHabits` / `periodFilter` / `setPeriodFilter` が `/dashboard` から不要になる。`HabitSimpleView` が使う値だけを返すように整理する（期間フィルターは `/habits` 側が独自に持つため、このフックから外してよい）

### 2. モバイルタブバーの slot 撤去

- `src/components/dashboard/MobileTabBar.tsx`: `useMobileTabBarSlotValue` の参照と slot セルの挿入を削除し、`NAV_ITEMS` から `/help` を除いた 4 タブだけを描画する
- `src/contexts/MobileTabBarSlotContext.tsx` を削除する
- `src/app/(dashboard)/layout.tsx`: `MobileTabBarSlotProvider` の import と JSX を削除する
- `src/components/dashboard/MobileTabBar.test.tsx`: slot に関するケースを削除し、4 タブが描画され `/settings` が右端に来ることを検証するケースだけを残す

### 3. 今日の母集団に絞る

`src/lib/utils/habits.ts` に純関数を追加する。

```ts
export function selectTodayHabits(habits: HabitWithProgress[]): HabitWithProgress[]
```

規則:

- `period === 'daily'` の習慣は**達成済みでも常に含める**
- `period === 'weekly'` / `'monthly'` は `currentProgress < frequency` のものだけ含める
- `archived === true` の習慣は含めない
- 入力の順序を保つ

日次を達成後も残すのは、円が全部埋まる絵を作るため。実装済みの全完了 pulse（`HabitSimpleView` の `isAllHabitsCompleted`）は「その日に見えている円が全部埋まった」ことを表すので、日次を消すとこの演出が成立しない。

この関数の単体テスト（`src/lib/utils/habits.test.ts` に追記、なければ新規）を書く。最低限のケース: 日次は完了済みでも残る / 週次は未達だけ残る / 月次は未達だけ残る / アーカイブ済みは除外 / 順序保持。

適用箇所: `DashboardWrapper` が `StreakDashboard` / `DesktopDashboard` に渡す habits を `selectTodayHabits` の結果にする。**完了判定・今日の進捗・全完了 pulse はすべて絞り込んだ後の集合を基準にする**（`useDashboardStats` に渡す配列も絞り込み後にする）。楽観的更新のキュー（`optimisticHabits` とその周辺）は絞り込み前の全習慣を保持したまま、描画用の派生値としてのみ絞ること。

### 4. 今日の進捗の表示

削除するリストビューのヘッダーにあった統計カード 2 枚のうち、

- **今日の進捗（`todayActive / totalDaily`）** は円グリッドの上部に**小さく**残す。既存の `DashboardStatsCard` をそのまま置くとカードが重いので、日付ラベルの近くに 1 行のテキスト（例: `2 / 5 完了`）として出す。配置は `HabitSimpleView` のヘッダー領域
- **総ストリーク** は出さない。`/analytics` に同等の StatCard が既にあるため（`src/app/(dashboard)/analytics/page.tsx:194`）、移設は不要で削除するだけでよい

`HabitSimpleView` への変更はこの進捗表示の追加に限る。**リングの掃引時間、反転、pulse の定数・タイミングには一切触らないこと**（`.claude/rules/debugging.md` と `plans/024`〜`028` に、この領域の変更が型チェックもテストも通るのに DOM だけ壊れる事例が記録されている）。

### 5. チェックイン機構の共有フック化

計画 030 の `/habits` が同じチェックイン機構を使うため、`DashboardWrapper.tsx` に埋まっている楽観的更新・キュー・リフレッシュのロジックを `src/hooks/useHabitCheckinQueue.ts` へ**振る舞いを変えずに**切り出す。

公開 API は以下に固定する。計画 030 がこの型に依存してコードを書くため、**シグネチャを勝手に変えないこと**。

```ts
export interface UseHabitCheckinQueueResult {
  archiveOptimistically: (habitId: string) => OptimisticRollback
  deleteOptimistically: (habitId: string) => OptimisticRollback
  handleAddCheckin: (habitId: string) => Promise<void>
  handleRemoveCheckin: (habitId: string) => Promise<void>
  handleSkip: (habitId: string) => Promise<void>
  handleUnSkip: (habitId: string) => Promise<void>
  optimisticHabits: HabitWithProgress[]
  resetOptimistically: (habitId: string) => OptimisticRollback
}

export function useHabitCheckinQueue(habits: HabitWithProgress[]): UseHabitCheckinQueueResult
```

移設対象は `runOptimisticUpdateForHabit` から `handleUnSkip` までの一連（props → state 同期、pending 管理、キュー、`scheduleRefresh` / `scheduleLazyRefresh`、`SyncContext` 連携、`useOfflineCheckin`、`useBeforeUnload`）。`DashboardWrapper` はこのフックを呼ぶだけの薄い層になる。

`.claude/rules/optimistic-updates.md` に書かれている以下の性質を壊さないこと。壊すと連打時のフリッカーやカウントずれとして表面化する。

- 最後の pending タスクだけが `finalizeCheckinProgress` を呼ぶ（中間タスクは楽観的状態を維持する）
- 同一 `habitId` のタスクはキューで直列化される
- props → state の同期は `useEffect` ではなく render 中の前回値比較で行う
- render 中の ref 更新は「値を写すだけ」の冪等な操作に限る

### 6. 削除するテスト・ストーリー

対象コードが消えるため、以下も削除する（ユーザー承認済み）。

- `src/components/streak/HabitListView.test.tsx`
- `src/components/streak/HabitListView.stories.tsx`
- `src/components/streak/HabitListCard.stories.tsx`
- `src/components/streak/DesktopDashboard.bottombar.test.tsx`
- `src/components/streak/StreakDashboard.stories.tsx`
- `src/contexts/__tests__/MobileTabBarSlotContext.test.tsx`

**`src/components/streak/HabitListView.tsx` と `HabitListCard.tsx` のファイル自体は削除しないこと。** 計画 030 がこの 2 ファイルを `src/components/habits/` へ移して再利用する。この計画では import を外すだけにとどめる。

`src/components/dashboard/DashboardStatsCard.tsx` も削除しないこと（未使用になるが、計画 030 とアナリティクスで使う可能性がある）。

### 7. ラベル

`src/locales/ja.json` の `navigation.dashboard` の**値**を「ダッシュボード」から「今日」へ変える。キー名、URL、`PAGE_TITLE_KEYS` は変えない。

## 触ってよいファイル

```text
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/dashboard/DashboardWrapper.tsx
src/app/(dashboard)/dashboard/DashboardWrapper.behavior.test.tsx
src/app/(dashboard)/layout.tsx
src/components/streak/StreakDashboard.tsx
src/components/streak/DesktopDashboard.tsx
src/components/streak/DesktopDashboard.stories.tsx
src/components/streak/HabitSimpleView.tsx
src/components/streak/useDashboardContent.ts
src/components/streak/types.ts
src/components/streak/DashboardViewToggle.tsx        (削除)
src/components/dashboard/MobileTabBar.tsx
src/components/dashboard/MobileTabBar.test.tsx
src/contexts/MobileTabBarSlotContext.tsx             (削除)
src/constants/dashboard.ts
src/hooks/useHabitCheckinQueue.ts                    (新規)
src/lib/utils/habits.ts
src/lib/utils/habits.test.ts
src/locales/ja.json
上記「削除するテスト・ストーリー」の 6 ファイル
```

**この一覧の外のファイルを変更しないこと。** 特に `src/components/habits/`、`src/app/(dashboard)/habits/`、`src/components/streak/HabitListView.tsx`、`src/components/streak/HabitListCard.tsx` は別担当が同時に編集している。

## 完了条件

- `pnpm exec tsc --noEmit` が通る
- `pnpm lint` が通る
- `pnpm exec vitest run` が通る
- `git status --short` に上記一覧の外のファイルが出ていない
- `/dashboard` にビュー切替の UI が一切残っていない（`DashboardViewToggle`、タブバー slot、cookie）
