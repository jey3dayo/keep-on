# 022 — Drawer の終了後に編集・詳細へ遷移する

- **Status**: TODO
- **Commit**: 5577aeb
- **Severity**: HIGH
- **Category**: Interruptibility / Easing & duration
- **Estimated scope**: 3 files, small behavior-and-test diff

## Problem

`HabitActionDrawer` closes the Vaul drawer and then waits a hand-written 350ms before navigating:

`src/components/dashboard/HabitActionDrawer.tsx:72-81`:

```tsx
const handleEdit = useCallback(() => {
  // Drawerを閉じて、アニメーション完了後に遷移
  onOpenChange(false)
  // Vaulのデフォルトアニメーション時間（300ms）より少し長く待つ
  setTimeout(() => {
    if (activeHabit) {
      router.push(`/habits/${activeHabit.id}/edit`)
    }
  }, 350)
}, [activeHabit, onOpenChange, router])
```

`src/components/dashboard/HabitActionDrawer.tsx:100-107` repeats the same timer for the detail route:

```tsx
const handleViewDetail = useCallback(() => {
  onOpenChange(false)
  setTimeout(() => {
    if (activeHabit) {
      router.push(`/habits/${activeHabit.id}`)
    }
  }, 350)
}, [activeHabit, onOpenChange, router])
```

The comment is stale for the installed contract. `package.json:83` allows Vaul `^1.1.2`; the resolved `node_modules/vaul/style.css:1-6` uses a 0.5s transition with `cubic-bezier(0.32, 0.72, 0, 1)`, and `node_modules/vaul/dist/index.mjs:437-445` defines `TRANSITIONS.DURATION = 0.5`. Vaul invokes its root `onAnimationEnd` callback after that duration (`node_modules/vaul/dist/index.mjs:879-891`). The current route therefore starts roughly 150ms before the drawer has finished leaving, cutting the spatial explanation short and potentially exposing the next page underneath the closing surface.

The fixed timer is also not interruptible: it is unrelated to the actual animation lifecycle, cannot follow future duration changes, and still delays a user who has enabled reduced motion. The drawer root is currently mounted as:

`src/components/dashboard/HabitActionDrawer.tsx:119-123`:

```tsx
<Drawer onOpenChange={onOpenChange} open={open}>
  {/* 下端固定の Drawer なので iOS のホームインジケータ分を確保する */}
  <DrawerContent className="pb-[env(safe-area-inset-bottom)]">
```

## Target

Use Vaul's lifecycle callback rather than a guessed delay. Store the requested destination in a ref, close the controlled drawer, and navigate exactly when Vaul reports `onAnimationEnd(false)`. A reduced-motion user should navigate immediately after requesting close instead of waiting for Vaul's internal 500ms callback.

The target shape in `HabitActionDrawer.tsx` is:

```tsx
const pendingNavigationRef = useRef<string | null>(null)

const handleDrawerAnimationEnd = useCallback(
  (isOpen: boolean) => {
    if (isOpen) {
      return
    }
    const destination = pendingNavigationRef.current
    if (!destination) {
      return
    }
    pendingNavigationRef.current = null
    router.push(destination)
  },
  [router]
)

const navigateAfterDrawerClose = useCallback(
  (destination: string) => {
    pendingNavigationRef.current = destination
    onOpenChange(false)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pendingNavigationRef.current = null
      router.push(destination)
    }
  },
  [onOpenChange, router]
)

const handleEdit = useCallback(() => {
  if (activeHabit) {
    navigateAfterDrawerClose(`/habits/${activeHabit.id}/edit`)
  }
}, [activeHabit, navigateAfterDrawerClose])

const handleViewDetail = useCallback(() => {
  if (activeHabit) {
    navigateAfterDrawerClose(`/habits/${activeHabit.id}`)
  }
}, [activeHabit, navigateAfterDrawerClose])
```

Pass the callback to the Vaul root:

```tsx
<Drawer onAnimationEnd={handleDrawerAnimationEnd} onOpenChange={onOpenChange} open={open}>
```

There must be no `setTimeout` in either navigation handler. `onAnimationEnd(true)` must never navigate; only a pending destination paired with `onAnimationEnd(false)` may call `router.push`.

## Repo conventions to follow

- `Drawer` is the `vaul` root re-exported by `src/components/ui/drawer.tsx:8`; its `onAnimationEnd(open: boolean)` contract is provided by Vaul and must be used as-is.
- Keep state and navigation ownership in `src/components/dashboard/HabitActionDrawer.tsx`; do not add a global drawer manager.
- Existing refs are used for lifecycle-only mutable state in the same component (`prevOpenRef` at `src/components/dashboard/HabitActionDrawer.tsx:38-51`).
- Existing reduced-motion policy is in `src/app/globals.css:482-489`; the JS branch should only remove the wait, not remove state or confirmation feedback.

## Steps

1. In `HabitActionDrawer.tsx`, add `pendingNavigationRef` next to the existing drawer refs and implement `handleDrawerAnimationEnd` with the exact open/closed and ref-clearing guards above.
2. Replace both 350ms timer handlers with `navigateAfterDrawerClose`, including the immediate `matchMedia('(prefers-reduced-motion: reduce)')` branch.
3. Pass `handleDrawerAnimationEnd` to the existing `Drawer` root without changing `DrawerContent`, safe-area padding, dialog transitions, or action labels.
4. Update the Vitest Vaul/Drawer mock in `vitest.mocks.tsx` so it accepts `onAnimationEnd?: (open: boolean) => void` and exposes a deterministic way for `HabitActionDrawer.test.tsx` to fire the callback. Add tests for: edit/detail do not navigate before the closed callback, closed callback navigates to the exact path once, opening callback does not navigate, and reduced motion navigates without a timer.

## Boundaries

- Do NOT change Vaul, `node_modules`, drawer duration, close threshold, or the drawer's visual styling.
- Do NOT add another arbitrary delay or poll for elapsed time.
- Do NOT navigate on `onOpenChange(false)` directly in the normal-motion path; the route must wait for `onAnimationEnd(false)`.
- Do NOT change skip/reset/archive/delete behavior or the controlled `open` contract.
- Do NOT add dependencies.
- If the resolved Vaul type does not expose `onAnimationEnd(open: boolean)`, stop and report the version/type mismatch instead of reverting to a guessed timeout.

## Verification

- **Mechanical**: run `pnpm lint`, `pnpm test:types`, and `pnpm test:run -- src/components/dashboard/HabitActionDrawer.test.tsx`. Expected result: all pass; `rg -n "setTimeout" src/components/dashboard/HabitActionDrawer.tsx` returns no navigation timer.
- **Feel check**: open a habit action drawer, choose 編集 and カレンダー履歴を見る, and observe that the drawer fully leaves before the destination renders. At 10% playback, the route must not cut off the final bottom-sheet frame.
- **Feel check**: rapidly close/reopen or swipe-dismiss the drawer without a pending destination; no route should be pushed. An opening animation callback must not consume a destination.
- **Feel check**: enable `prefers-reduced-motion: reduce`; choosing edit/detail should not wait 500ms for Vaul, and must still navigate once.
- **Done when**: navigation is synchronized to Vaul's actual close completion, reduced-motion navigation is immediate, both destinations are covered by tests, and no fixed navigation timeout remains.
