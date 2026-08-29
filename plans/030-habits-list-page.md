# 030 /habits を習慣リストページに差し替える

## 背景と決定

`/habits` は現在、名前・期間・頻度・作成日だけを並べる管理テーブル（`HabitTableClient`）で、進捗もストリークも表示していない（`src/components/habits/HabitTable.tsx:24-32` が `currentProgress: 0, streak: 0` をハードコードしている）。一方 `/dashboard` には、進捗バーとチェックインを備えたリストビューが「円グリッドとの切替」という形で埋まっていた。

ユーザーとの設計合意により、以下を確定した。

- `/dashboard` は円グリッド専用にする（別計画 029）
- そこにあったリストビューを `/habits` へ移し、**`/habits` を全習慣の台帳**にする
- `/habits` の URL とタブのラベル「習慣」は据え置く。子ルート `/habits/[id]`・`/habits/new` もそのまま
- 旧管理テーブル（`HabitTable` / `HabitTableClient` / `HabitTableActions`）は廃止する
- **リストからもチェックインできる**。`/dashboard` との違いは操作の有無ではなく、見えている母集団（今日やる分 / 全習慣）
- 期間フィルターに「アーカイブ済み」を足し、アーカイブ済みは絞り込みの一状態として扱う
- 「アーカイブ / 復元」という語彙は変えない

## この計画の担当範囲

`/habits` 側のみ。`/dashboard`、`src/components/dashboard/MobileTabBar.tsx`、`src/contexts/`、`src/locales/ja.json` には触らない（計画 029 の担当）。

## 前提: 別担当が提供する共有フック

計画 029 が `src/hooks/useHabitCheckinQueue.ts` を新設し、`DashboardWrapper` の楽観的更新・キュー機構をそこへ切り出す。公開 API は以下に固定されている。**この型に合わせて `/habits` 側を書くこと。自分でこのファイルを作らない。**

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

作業中はこのファイルがまだ存在せず、`tsc` がこの import だけを解決できないことがある。**その場合はスタブを作らず、報告にその旨を書いて他の検証を進めること。**

## やること

### 1. リストビューを `src/components/habits/` へ移す

`git mv` で移設し、import を追随させる。

- `src/components/streak/HabitListView.tsx` → `src/components/habits/HabitListView.tsx`
- `src/components/streak/HabitListCard.tsx` → `src/components/habits/HabitListCard.tsx`

計画 029 が `/dashboard` 側の import を外すので、移設後にこの 2 ファイルを参照するのは `/habits` だけになる。

`HabitListCard` の中身（大きなチェックインボタン、頻度 > 1 のときの ± ボタン、`h-2` の進捗バー、ストリークの炎、右上の「…」）は変えない。

### 2. `/habits` のデータ取得を進捗つきにする

`src/app/(dashboard)/habits/page.tsx` と `src/components/habits/HabitTable.tsx` の現行構成を、以下に置き換える。

- アクティブな習慣は `getHabitsWithProgress(user.id, user.externalId, dateKey, user.weekStart)` で取る。`src/app/(dashboard)/dashboard/page.tsx` が同じ関数を使っているので、引数の作り方（`getServerDateKey` / `getServerTimeZone`、`getRequestTimeoutMs`、`withDbRetry`、`logSpanOptional`）はそちらに倣う
- アーカイブ済みは従来どおり `getArchivedHabits(user.id)` で取る。`getHabitsWithProgress` はアーカイブ済みを除外する（`src/lib/queries/habit-read.ts:232,237,243`）ので、両者は重複しない
- アーカイブ済みの習慣は進捗を持たないため、`HabitWithProgress` へ変換する際の `currentProgress` / `streak` / `completionRate` は 0 のままでよい。ただし `archived: true` を必ず立てること（フィルターと操作可否の判定に使う）
- キャッシュを使う場合は `getHabitsCacheSnapshot` と stale フォールバックも `/dashboard` に倣う。難しければ素直に取得するだけでよい

**これはページの表示を差し替えるだけの作業ではなく、クエリ量が `/dashboard` と同等になる変更である。** タイムアウトとエラー処理を `/dashboard` と同じ水準で入れること。

### 3. 期間フィルターに「アーカイブ済み」を足す

`HabitListView` 内の `PeriodSegmentedControl`（現行のセグメントは `すべて / 日次 / 週次 / 月次`）に `アーカイブ済み` を加える。

- 型は `src/components/streak/types.ts` の `DashboardPeriodFilter`（`'all' | Period`）を拡張するのではなく、`/habits` 用の型を `src/components/habits/` 側に新設する。`src/components/streak/types.ts` は計画 029 が編集するため触らない
- `すべて` は**アクティブな習慣のみ**を指す。アーカイブ済みは `アーカイブ済み` を選んだときだけ出す。この区別をコメントで残すこと
- 件数キャプション（`N件` / `N件 / 全M件`）の意味が壊れないようにする
- radiogroup の矢印キー操作（`HabitListView` の既存実装）が新セグメントでも動くこと

### 4. アーカイブ済み行の操作可否

サーバー側でアーカイブ済みの習慣はチェックインできない（`src/lib/actions/checkin-shared.ts:66-67` が `!habit.archived` を要求し、`archived` を理由に失敗させる）。削除はアーカイブ済みにしか許されていない（`src/app/actions/habits/delete.ts:16-19`）。

UI をこの制約に合わせる。

- アーカイブ済みの行では、チェックインボタンと ± ボタンを `disabled` にする（押せてから失敗する、にしない）
- アーカイブ済みの行のドロワーは「復元」と「完全に削除」だけを出す。`HabitActionDrawer` は既に `archived` を見て出し分ける実装があるので（`src/components/dashboard/HabitActionDrawer.tsx:179-206`）、まずそれで足りるか確認し、足りない場合のみ最小限を足す
- 「復元」は `HabitUnarchiveButton` が持つ `unarchiveHabitAction` の呼び出しを流用する

### 5. 旧管理テーブルの廃止

以下を削除する。

- `src/components/habits/HabitTable.tsx`
- `src/components/habits/HabitTableClient.tsx`
- `src/components/habits/HabitTableActions.tsx`
- 上記に対応するテスト・ストーリーがあれば併せて削除する（削除前に一覧を報告に書くこと）

`HabitArchiveDialog` / `HabitDeleteDialog` / `HabitUnarchiveButton` は、リスト側またはドロワーから使うので**削除しない**。使われなくなるものがあれば、削除せず報告に挙げること。

### 6. 作成導線

旧ページのヘッダーにあった「新しい習慣」ボタン（`/habits/new?step=preset` への Link）は残す。`HabitListView` は既に `onAddHabit` を受け取り、空状態とリスト末尾に「習慣を追加」を出すので、ヘッダーのボタンと重複しすぎないよう置き方を整える。

### 7. テスト

- 移設した `HabitListView` / `HabitListCard` に対して、`/habits` としての振る舞いのテストを書く。最低限: 「アーカイブ済み」フィルターでアーカイブ済みだけが出る / アーカイブ済み行のチェックインが `disabled` である / `すべて` にアーカイブ済みが混ざらない
- 削除した `HabitListView.test.tsx`（計画 029 が消す）の検証内容のうち、リストとして今も意味があるものは新しいテストへ引き継ぐ

## 触ってよいファイル

```text
src/app/(dashboard)/habits/page.tsx
src/components/habits/HabitTable.tsx             (削除)
src/components/habits/HabitTableClient.tsx       (削除)
src/components/habits/HabitTableActions.tsx      (削除)
src/components/habits/HabitListView.tsx          (streak から git mv)
src/components/habits/HabitListCard.tsx          (streak から git mv)
src/components/habits/ 配下の新規ファイル（型定義、クライアントラッパー、テスト）
src/components/habits/HabitUnarchiveButton.tsx   (必要なら)
src/components/dashboard/HabitActionDrawer.tsx   (アーカイブ済み出し分けが足りない場合のみ)
```

**この一覧の外のファイルを変更しないこと。** 特に以下は別担当が同時に編集している。

- `src/app/(dashboard)/dashboard/` 配下すべて
- `src/app/(dashboard)/layout.tsx`
- `src/components/streak/` 配下（`HabitListView.tsx` / `HabitListCard.tsx` の `git mv` を除く）
- `src/components/dashboard/MobileTabBar.tsx`
- `src/contexts/`
- `src/constants/dashboard.ts`
- `src/locales/ja.json`
- `src/hooks/useHabitCheckinQueue.ts`

## 完了条件

- `pnpm exec tsc --noEmit` が通る（`useHabitCheckinQueue` 未着地による失敗を除く。その場合は報告に明記する）
- `pnpm lint` が通る
- `pnpm exec vitest run` が通る
- `git status --short` に上記一覧の外のファイルが出ていない
- `/habits` に旧管理テーブルが残っていない
