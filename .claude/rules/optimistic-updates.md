# 楽観的更新 実装パターン

## 概要

ユーザーアクションに即時フィードバックを提供するための楽観的更新パターン。
`DashboardWrapper.tsx` のチェックイン処理を参照実装とする。

## 基本方針

- `useOptimistic`（React 19標準）ではなく `useState` + 手動ロールバックパターンを使用
- `useTransition` は `router.refresh()` などの非優先更新に使う（UIをブロックしない）
- サーバーへの書き込みは Server Actions 経由

## 1. 楽観的更新の基本パターン

### `runOptimisticUpdateForHabit`（更新 + ロールバック関数を返す）

```typescript
const runOptimisticUpdateForHabit = (
  habitId: string,
  updater: (current: HabitWithProgress[]) => HabitWithProgress[],
) => {
  let previousHabit: HabitWithProgress | null = null;
  let previousIndex = -1;
  setOptimisticHabits((current) => {
    previousIndex = current.findIndex((habit) => habit.id === habitId);
    previousHabit = previousIndex >= 0 ? current[previousIndex] : null;
    return updater(current);
  });
  // ロールバック関数を返す
  return () => {
    if (!previousHabit) return;
    const rollbackHabit = previousHabit;
    setOptimisticHabits((current) => {
      const existingIndex = current.findIndex((habit) => habit.id === habitId);
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = rollbackHabit;
        return next;
      }
      // 削除されていた場合は元の位置に復元
      const next = [...current];
      const insertIndex =
        previousIndex >= 0 && previousIndex <= next.length
          ? previousIndex
          : next.length;
      next.splice(insertIndex, 0, rollbackHabit);
      return next;
    });
  };
};
```

### 特徴

- 更新前の状態をクロージャでキャプチャ
- 返り値のロールバック関数でUI状態を元に戻す
- 削除パターンでも元の位置に復元する

### `canApply` ガード（上限・下限チェック）

```typescript
const queueOptimisticCheckin = (habitId, options) => {
  const targetHabit = optimisticHabits.find((habit) => habit.id === habitId)
  if (!targetHabit) return
  if (!options.canApply(targetHabit)) return  // ガードチェック

  updateHabitProgress(habitId, options.delta)
  enqueueCheckin({ habitId, ..., rollback: () => updateHabitProgress(habitId, -options.delta) })
}

// 上限チェック（追加）
canApply: (habit) => habit.currentProgress < habit.frequency

// 下限チェック（削除）
canApply: (habit) => habit.currentProgress > 0
```

### 失敗時のロールバックと成功時の確定

```typescript
// 成功時: 最後のpendingタスクのみサーバー値で確定（中間タスクは楽観的状態を維持）
if (ok) {
  shouldRollback = false
  const pendingCount = pendingCountRef.current.get(task.habitId) ?? 0
  if (pendingCount <= 1 && 'currentCount' in result.data) {
    finalizeCheckinProgress(task.habitId, result.data.currentCount)
  }
  scheduleLazyRefresh()
  return
}

// 失敗時: rollback() で即座にUIを戻す
finally {
  if (shouldRollback && task.rollback) {
    task.rollback()
  }
}
```

## 2. キュー・同時実行制御

### 定数

```typescript
// src/constants/dashboard.ts
export const MAX_CONCURRENT_CHECKINS = 2; // 並列実行数の上限
```

### キューフロー

```text
enqueueCheckin → drainCheckinQueue → startCheckinTask → runCheckinTask
                       ↑                    |
                       └────────────────────┘ (finally で次のタスクを処理)
```

### 同一 habitId の直列化

```typescript
const drainCheckinQueue = () => {
  while (
    activeRequestCountRef.current < MAX_CONCURRENT_CHECKINS &&
    checkinQueueRef.current.length > 0
  ) {
    // まだ実行中でない habitId のタスクを優先的に選択
    const nextIndex = checkinQueueRef.current.findIndex(
      (task) => !activeHabitsRef.current.has(task.habitId),
    );
    if (nextIndex === -1) break; // すべて実行中 → 待機
    const next = checkinQueueRef.current.splice(nextIndex, 1)[0];
    startCheckinTask(next);
  }
};
```

### 特徴

- `activeHabitsRef`（Set）で実行中の habitId を追跡
- 同一 habitId のタスクはキューで直列化（順序保証）
- タスク完了後に `drainCheckinQueue()` を呼んで次を処理

## 3. リフレッシュ戦略

### `scheduleRefresh`: デバウンス付き即時リフレッシュ

```typescript
const scheduleRefresh = () => {
  if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
  refreshTimeoutRef.current = setTimeout(() => {
    if (isRefreshing.current) return;
    if (pendingCheckinsRef.current.size > 0) return; // pending がある場合はスキップ
    isRefreshing.current = true;
    startTransition(() => {
      router.refresh();
      setTimeout(() => {
        isRefreshing.current = false;
      }, 1000);
    });
  }, 500); // 500ms デバウンス
};
```

- pending が全て完了後に 500ms デバウンスで `router.refresh()`
- `startTransition` でラップして非ブロッキング

### `scheduleLazyRefresh`: バックグラウンド整合性リフレッシュ

```typescript
const scheduleLazyRefresh = () => {
  refreshTimeoutRef.current = setTimeout(() => {
    if (isRefreshing.current || pendingCheckinsRef.current.size > 0) return;
    isRefreshing.current = true;
    startTransition(() => {
      router.refresh();
    });
  }, 300_000); // 5分
};
```

- 成功後 5分でのバックグラウンドリフレッシュ（整合性フォールバック）
- チェックイン連打中は上書きされるため最後の操作から5分後に実行

## 4. 同期状態の管理

### `SyncContext` でローディング状態をグローバルに通知

```typescript
const { startSync, endSync, isSyncing } = useSyncContext();

// チェックイン開始時
startSync(habitId);

// チェックイン完了時（成功・失敗問わず）
endSync(habitId);
```

### `useBeforeUnload` で同期中のページ離脱を警告

```typescript
useBeforeUnload(isSyncing); // true の間はページ離脱確認ダイアログを表示
```

### pending 管理（多重呼び出し対応）

```typescript
// pendingCheckinsRef: Set<habitId> - habitId が pending かどうか
// pendingCountRef: Map<habitId, count> - 同一 habitId の重複呼び出し数

const addPendingCheckin = (habitId) => {
  const currentCount = pendingCountRef.current.get(habitId) ?? 0;
  pendingCountRef.current.set(habitId, currentCount + 1);
  if (currentCount === 0) pendingCheckinsRef.current.add(habitId);
  startSync(habitId);
};

const clearPendingCheckin = (habitId) => {
  const currentCount = pendingCountRef.current.get(habitId) ?? 0;
  if (currentCount <= 1) {
    pendingCountRef.current.delete(habitId);
    pendingCheckinsRef.current.delete(habitId);
    // pending が空になったらリフレッシュを再スケジュール
    if (pendingCheckinsRef.current.size === 0 && refreshTimeoutRef.current) {
      scheduleRefresh();
    }
  } else {
    pendingCountRef.current.set(habitId, currentCount - 1);
  }
  endSync(habitId);
};
```

## 5. サーバー状態との同期パターン

### props → state の同期（derive state from props）

```typescript
const [prevHabits, setPrevHabits] = useState(habits);
const [optimisticHabits, setOptimisticHabits] = useState(habits);

// props が変わったとき（router.refresh() 後）に楽観的状態をリセット
if (prevHabits !== habits) {
  setPrevHabits(habits);
  setOptimisticHabits(habits);
}
```

注意: `useEffect` ではなく render 中に直接比較することで、フラッシュを防ぐ。

### render 中の ref 更新は「冪等な写し」に限る

前回値を `ref` に持って render 中に書き換えてよいのは、`currentPageRef.current = currentPage` のように
**値を写すだけ**の冪等な操作に限る。差分の計算のように非冪等な処理を render 中の ref で行うと、
同一コミット内で 2 回 render されたときに 1 回目で ref が更新済みとなり、2 回目の差分が 0 になる。
DOM へ反映されるのは 2 回目の値なので、**結果は常に「差分なし」に潰れる**。

Next.js の dev は React StrictMode が既定で有効なため、開発中は必ずこれを踏む。型チェックもテストも
通り、コードを読む限り正しく見えるのに実際の DOM だけが違う、という形で現れる（2026-08-29 に
`HabitCircleItem` のリング掃引時間が常に下限へ潰れる不具合として発生）。

差分が要る場合は、上記の props → state 導出パターンで前回値を state に持つ:

```typescript
const [prevProgress, setPrevProgress] = useState(progress);
const [durationMs, setDurationMs] = useState(MIN_DURATION_MS);
if (prevProgress !== progress) {
  setPrevProgress(progress);
  setDurationMs(computeDuration(Math.abs(progress - prevProgress)));
}
```

2 回目の render では `prevProgress === progress` となり再計算が走らないため冪等になる。

## 6. どのケースで使うか / 使わないか

### 使う（楽観的更新が有効なケース）

- ユーザーアクションの頻度が高い（連打・連続操作）
- 即時フィードバックがUXに直接影響する
- Server Action のレスポンスが体感できるほど遅い（>200ms）
- ロールバックが容易な操作（カウントのインクリメント/デクリメントなど）

### 使わない（楽観的更新が不適切なケース）

- データ整合性が最優先（決済、在庫管理など）
- 一回性の操作（習慣の作成・削除、フォーム送信）
- ロールバックが複雑すぎる操作
- エラー時の影響範囲が大きい操作

日別カウントのように「全削除（0 にする）」を挟む操作や、`router.refresh()` の往復中に追加の操作が
起きうる画面では、上記の delta ロールバックパターンではなく 8. の「確定値 + 未確定操作列」パターンを使う。

## 7. 連続操作時のフリッカー防止

### 問題

同一 habitId に対する連打（例: 3回連続クリック）で中間タスク完了時にサーバーの `currentCount`（中間値）で楽観的状態を上書きし、`1→2→3→2→4` のようにフリッカーが発生する。

### 原因

`runCheckinTask` 内の `finalizeCheckinProgress(habitId, result.data.currentCount)` が毎回呼ばれていた。

3回連続クリック時のタイムライン（修正前）:

1. Click 1,2,3: 楽観的状態 0→1→2→3（正常）
2. Task1 完了: `finalizeCheckinProgress(id, 1)` → **3→1 にフリッカー!**
3. Task2 完了: `finalizeCheckinProgress(id, 2)` → 1→2
4. Task3 完了: `finalizeCheckinProgress(id, 3)` → 2→3

### 解決策

`pendingCountRef` を参照し、最後のタスクのみ `finalizeCheckinProgress` を実行:

```typescript
if (ok) {
  shouldRollback = false;
  // 最後のpendingタスクのみサーバー値で確定（中間タスクは楽観的状態を維持）
  const pendingCount = pendingCountRef.current.get(task.habitId) ?? 0;
  if (pendingCount <= 1 && "currentCount" in result.data) {
    finalizeCheckinProgress(task.habitId, result.data.currentCount);
  }
  scheduleLazyRefresh();
  return;
}
```

### なぜ安全か

- `clearPendingCheckin` は `finally` ブロックで呼ばれるため、この時点の `pendingCount` は decrement 前の値
- `pendingCount === 1` = 自分が最後のタスク
- 中間タスクは `shouldRollback = false` でロールバックされず、楽観的状態がそのまま維持される
- 最終的な整合性は `scheduleLazyRefresh`（5分）と `scheduleRefresh`（pending=0後500ms）で保証

## 8. 確定値 + 未確定操作列パターン（日別カウントのカレンダー実装）

`DashboardWrapper.tsx` の delta ロールバック（1. 参照）は、操作が可換（+1/-1 の組み合わせ）である前提に
立っている。`HabitCalendarHeatmap.tsx` の日別チェックインカレンダーはこの前提が崩れるケースを実装中に
踏んだため、「確定値（サーバー snapshot）＋ 未確定操作列」を source of truth とし、表示値はその都度
導出する設計に変えた。

### (a) delta ロールバックは操作が可換でないと壊れる

失敗時に「現在の楽観値 + (-1)」を適用する方式は、全削除（0 にする clear 操作）を挟むと壊れる。

例: frequency=1・初期値0 で、応答が返る前に add / clear / add を積むと楽観値は 1。最初の add が
失敗して `-1` が現在値へ適用されると 0 になり、その後 clear が成功・最後の add が成功しても表示は
0 のまま固定される（DB は 1）。

対処は、確定値と未確定操作列を分離し、表示は「確定値へ未確定操作列を順に適用した結果」として導出する
（`computeEffectiveCount` / `computeDisplayCounts`）。成功した操作は確定値へ畳み込んで列から除き、
失敗した操作は列から除くだけにする。相対的な巻き戻し（delta の逆算）が不要になるため非可換性が消える。

### (b) サーバー snapshot は世代を識別しないと採用できない

`router.refresh()` を投げてからサーバーが DB を読むまでの間に別の操作が起きると、届いた snapshot が
その操作を含むのか含まないのか判別できない。含む snapshot を未確定操作列と併せて適用すると二重適用に
なり、含まない古い snapshot は成功済みの状態を巻き戻す。

対処は2段構え。未確定操作が残っている間は snapshot を無条件に破棄する。加えて、確定値を書き換えた
回数（成功時のみ増える世代カウンタ）と、refresh を投げた時点の世代を比較し、不一致なら破棄する。
破棄した snapshot は取り直す。

注意: 「push でも fold でも進める単一カウンタ」にすると、失敗した操作が世代を進めたまま畳み込まれない
ため、**一度でも操作が失敗するとその画面の snapshot を恒久的に拒否し続ける**（実装中に検出した回帰）。
世代カウンタは成功時（fold 時）のみ進める。

### (c) 失敗は書き込みの有無で分類して再同期を出し分ける

`created:false`（上限到達）やバリデーション拒否は書き込みが起きていないことが確定しているため再同期は
不要。`DatabaseError` や通信例外はミューテーション実行中の失敗で書き込みが起きたかどうか分からないため、
キューが落ち着いた後にサーバー再同期する。この分類を `boolean` に潰すと、失敗理由をユーザーへ誤って
伝えることになる（通信エラーを「上限に達しています」と表示するなど）。

### (d) 直列化の単位は「共有する制約」に合わせる

frequency の上限が日別ではなく期間単位（daily/weekly/monthly）で共有される画面では、dateKey ごとに
キューを分けると同じ期間に属する別日の操作が並行実行され、投入順と実行順がずれる（例: 月曜を clear →
火曜に add、のつもりが add が先に走って期間上限に拒否される）。制約を共有する範囲（この実装では habit
単位）で単一のタスクチェーンにする。

## 関連ファイル

- `src/app/(dashboard)/dashboard/DashboardWrapper.tsx` - delta ロールバック方式の参照実装
- `src/components/habits/HabitCalendarHeatmap.tsx` - 確定値 + 未確定操作列パターンの参照実装（8.）
- `src/contexts/SyncContext.tsx` - グローバル同期状態
- `src/hooks/useBeforeUnload.ts` - ページ離脱警告
- `src/constants/dashboard.ts` - `MAX_CONCURRENT_CHECKINS`
