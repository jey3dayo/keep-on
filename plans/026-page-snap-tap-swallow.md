# 026 — ページスナップ中のチェックインタップ喪失を直し、ページドットを retarget 可能にする

- **Status**: TODO
- **Commit**: c74f61c
- **Severity**: HIGH
- **Category**: Purpose & frequency / Interruptibility
- **Estimated scope**: 1 file（`src/hooks/usePageSwipe.ts`）+ 既存テストの確認

## Problem

アプリ最高頻度の操作（チェックインタップ）が、直前のスワイプのスナップアニメーション
（`PAGE_SWIPE_TRANSITION_DURATION_MS = 250`, `src/constants/interaction.ts:24`）の最中に **握りつぶされる**。

```ts
// src/hooks/usePageSwipe.ts:275-280 — current
const handlePointerDown = useCallback(
  (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || totalPages <= 1 || activePointerRef.current || isSnapping) {
      return
    }
    didSwipeRef.current = false
```

`isSnapping` の early-return が `didSwipeRef.current = false` より **前** にあるため、
スワイプ後にブラウザが click を抑制したケース（大きなポインタ移動後は一般的）では
`didSwipeRef` が `true` のまま残る。次のタップが 250ms のスナップ窓内に来ると
pointerdown はフラグを消さずに return し、祖先の capture ハンドラがタップの click を殺す:

```ts
// src/hooks/usePageSwipe.ts:386-393 — current
const handleClickCapture = useCallback((event: MouseEvent<HTMLDivElement>) => {
  if (!didSwipeRef.current) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  didSwipeRef.current = false
}, [])
```

これは `src/components/streak/HabitSimpleView.tsx:255` で全 `HabitCircleItem` の祖先に
capture-phase で張られているため、円側の `onClick`（チェックイン）より先に発火する。

併せて、ページドットのタップもスナップ中は完全に捨てられる（retarget されない）:

```ts
// src/hooks/usePageSwipe.ts:258-262 — current
const animateToPage = useCallback(
  (targetPage: number) => {
    if (isSnapping || activePointerRef.current) {
      return
    }
```

ルール: 最高頻度の操作はアニメーションを待たせない・アニメーションに殺されない。
CSS transition は途中値から retarget できるので、ドットタップは捨てずに向き直すべき。

## Target

1. pointerdown は snap 中でも `didSwipeRef` を先にリセットしてから return する:

```ts
// target: handlePointerDown 冒頭
if (!event.isPrimary || totalPages <= 1 || activePointerRef.current) {
  return
}
// 直前スワイプの click 抑制でフラグが残っていても、次のタップは通す
didSwipeRef.current = false
if (isSnapping) {
  return
}
```

1. `animateToPage` はスナップ中でも新しいページへ retarget する（transition は現在位置から向き直る）:

```ts
// target: animateToPage
const animateToPage = useCallback(
  (targetPage: number) => {
    if (activePointerRef.current) {
      return
    }
    ...
  },
  [settleInteraction, totalPages]
)
```

`settleInteraction`（`usePageSwipe.ts:224`）は冒頭で `clearSnapTimer()` を呼び、
`pendingPageRef` / `dragOffset` / snap timer を張り直すため、追加の後始末は不要。
`isSnapping` を deps から外すこと。

## Repo conventions to follow

- このフックは既に「transition retarget」前提で組まれている（`settleInteraction` が timer を清算して再設定、`handleTransitionEnd`:376 が transform の transitionend で `completeSnap`）。その構造を維持する。
- 定数は `src/constants/interaction.ts`。新しいマジックナンバーを増やさない。

## Steps

1. `src/hooks/usePageSwipe.ts` の `handlePointerDown`（275 行目付近）を Target 1 の形に並べ替える。ガード条件から `isSnapping` を分離し、`didSwipeRef.current = false` をその前に移す。deps 配列（`[isSnapping, totalPages]`）は変更不要。
2. `animateToPage`（258 行目付近）のガードから `isSnapping ||` を削除し、deps から `isSnapping` を外す（Target 2）。
3. 既存テストを実行し、snap 中のドットタップを捨てる仕様のテストがあれば「retarget する」期待に更新する（テストファイルは `src/hooks/` 近傍の `*.test.ts` を grep で特定）。

## Boundaries

- スナップ中に **track をドラッグで掴む**（mid-flight grab）対応はスコープ外。`handlePointerDown` の `isSnapping` early-return 自体は残す。
- 速度ベースの snap duration 化・spring 化はスコープ外（別検討）。
- `PAGE_SWIPE_*` 定数の値は変更しない。
- 見つけたコードが Commit 時点とずれていたら STOP して報告する。

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit`、`pnpm exec biome check src/hooks/usePageSwipe.ts`、`pnpm test:run -- usePageSwipe`（該当テストがあれば）すべて成功。
- **Feel check**: `pnpm dev` のダッシュボード（シンプルビュー・2 ページ以上の習慣数）で、
  - 素早くスワイプ → 着地アニメーション中（250ms 以内）に習慣円をタップ → チェックインが **必ず** 反応する（10 回試行して取りこぼし 0）。
  - スナップ中にページドットを連打すると、アニメーションが現在位置から新しいページへ滑らかに向き直る（ゼロからの再スタートや無視が起きない）。
  - 通常のスワイプでページ送り自体が壊れていない（スワイプ後の誤 click 抑制も引き続き効く: スワイプの指を円の上で離してもチェックインされない）。
- **Done when**: 上記 feel check 3 点がすべて成立し、テストが green。
