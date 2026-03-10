<!-- markdownlint-disable MD024 -->

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

**注意:** `useEffect` ではなく render 中に直接比較することで、フラッシュを防ぐ。

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

## 関連ファイル

- `src/app/(dashboard)/dashboard/DashboardWrapper.tsx` - 参照実装
- `src/contexts/SyncContext.tsx` - グローバル同期状態
- `src/hooks/useBeforeUnload.ts` - ページ離脱警告
- `src/constants/dashboard.ts` - `MAX_CONCURRENT_CHECKINS`
