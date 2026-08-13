# Plan 008: Reject offline enqueue when Clerk userId is missing

> **Executor instructions**: Follow this plan step by step. Run every verification. On STOP conditions, stop and report. Reviewer maintains `plans/README.md` if dispatched via improve execute.
>
> **Drift check**: `git diff --stat d5df968..HEAD -- src/hooks/useOfflineCheckin.ts src/hooks/useOfflineCheckin.test.ts src/app/(dashboard)/dashboard/DashboardWrapper.tsx`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `d5df968`, 2026-08-13

## Why this matters

`enqueueCheckin` returns successfully when `userId` is missing, so `DashboardWrapper`'s `.catch` rollback never runs and the UI stays optimistically checked-in with nothing queued for sync.

## Current state

```ts
// src/hooks/useOfflineCheckin.ts:186-191
const currentUserId = userIdRef.current
// 未サインインのチェックインはそもそも成功しないため、照合不能なアイテムを積まずに捨てる
if (!currentUserId) {
  return
}
```

```ts
// DashboardWrapper.tsx:405-412
enqueueOfflineCheckin(habitId, options.isRemove ? 'remove' : 'add', dateKey)
  .catch(() => {
    appToast.error('オフラインキューへの保存に失敗しました')
    updateHabitProgress(habitId, -options.delta)
  })
```

Existing tests: `src/hooks/useOfflineCheckin.test.ts` (mocks offline-queue).

## Commands

| Purpose | Command | Expected |
| --------- | --------- | ---------- |
| Tests | `pnpm test:run -- src/hooks/useOfflineCheckin` | all pass |
| Types | `pnpm exec tsc --noEmit` | exit 0 |
| Lint | `pnpm exec biome check --write src/hooks/useOfflineCheckin.ts src/hooks/useOfflineCheckin.test.ts` | exit 0 |

## Scope

**In scope**: `src/hooks/useOfflineCheckin.ts`, `src/hooks/useOfflineCheckin.test.ts`
**Out of scope**: `DashboardWrapper.tsx` (already has `.catch` — do not change unless tests prove call site lacks await/catch), offline-queue IndexedDB implementation, SW

## Git workflow

- Branch: `advisor/008-offline-enqueue-reject-missing-userid`
- Commit: `fix(pwa): reject offline enqueue when userId is missing`
- Do NOT push

## Steps

### Step 1: Reject instead of silent return

Replace the early `return` with `throw new Error(...)` or `return Promise.reject(new Error(...))` with a clear message (Japanese or English OK; match nearby style). Keep the comment explaining why unsigned-in items must not be queued, but make the failure visible to callers.

**Verify**: code no longer `return`s void on missing userId without rejecting.

### Step 2: Unit test

In `useOfflineCheckin.test.ts`, set `mockUserId = null`, call `enqueueCheckin`, expect rejection and that `mockEnqueueOfflineCheckin` was **not** called.

**Verify**: `pnpm test:run -- src/hooks/useOfflineCheckin` → pass

### Step 3: Format + typecheck

**Verify**: biome + `tsc --noEmit` exit 0

## Done criteria

- [ ] Missing userId rejects; IndexedDB enqueue not called
- [ ] New test covers the case
- [ ] No out-of-scope files changed

## STOP conditions

- Call sites exist that assume void success without `.catch` and would throw unhandled rejections in production UI without an easy fix in-scope — report those call sites

## Maintenance notes

- Dashboard optimistic path depends on rejection → catch → rollback. Keep that contract if enqueue semantics change again.
