# Plan 017: Load the habits list without dashboard-grade progress queries

> **Executor instructions**: Follow this plan step by step. Run every verification. On STOP conditions, stop and report. Reviewer maintains `plans/README.md` if dispatched via improve execute.
>
> **Drift check**: `git diff --stat 0f714c1..HEAD -- src/components/habits/HabitTable.tsx src/components/habits/HabitTableClient.tsx src/app/(dashboard)/habits/page.tsx src/lib/queries/habit-read.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0f714c1`, 2026-08-14

## Why this matters

`/habits` renders a table of name / period / frequency / createdAt / actions only, but `HabitTable` calls `getHabitsWithProgress` (≈1 year of checkins/skips + streak math per habit) plus habits KV snapshot orchestration. That burns D1 and CPU on every list visit for fields the UI never shows.

## Current state

```ts
// src/components/habits/HabitTable.tsx:39-46
const [activeHabitsResult, archivedHabitsResult] = await Promise.allSettled([
  logSpan(
    'habits.table.query',
    () => getHabitsWithProgress(userId, externalId, dateKey, undefined, cacheSnapshot),
    meta,
    { timeoutMs }
  ),
  logSpan('habits.table.archived', () => getArchivedHabits(userId), meta, { timeoutMs }),
])
```

```tsx
// HabitTableClient.tsx:52-64 — columns used for active rows
// name, period, frequency, createdAt (+ icon/color/actions). No currentProgress / streak.
```

`getHabitsByUserId(userId)` already returns active (non-archived) habits ordered by `createdAt` desc (`habit-read.ts:92-105`).

Archived rows already map dummy progress fields (`HabitTable.tsx:81-87`). Active rows can use the same zeroed progress shape when the client type is still `HabitWithProgress[]`.

Stale-cache fallback currently depends on progress-shaped KV data — after this change, **do not** call `getHabitsCacheSnapshot` for the list page.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Types | `pnpm exec tsc --noEmit` | exit 0 |
| Lint | `pnpm exec biome check --write src/components/habits/HabitTable.tsx` | exit 0 |
| Tests | `pnpm test:run -- src/components/habits` (if tests exist) else skip and note | pass or none |

## Scope

**In scope**:

- `src/components/habits/HabitTable.tsx`
- Optionally narrow props/types in `HabitTableClient.tsx` **only if** required for types (prefer keeping `HabitWithProgress` with zeros to minimize churn)

**Out of scope**:

- Moving data fetching out of `src/components/` into the page (architecture follow-up; not required for the perf win)
- Changing dashboard / analytics loaders
- Plan 013 analytics collapse
- Passing `weekStart` into progress fetch (moot once progress fetch is removed)
- Editing `getHabitsWithProgress` implementation

## Git workflow

- `perf(habits): skip progress fetch on habits list`
- Do NOT push/PR unless asked

## Steps

### Step 1: Swap active query

In `HabitTable.tsx`:

1. Remove imports/usage of `getHabitsCacheSnapshot`, `getHabitsWithProgress`, `getServerDateKey`, and stale-fallback branches that exist only for progress cache.
2. Import `getHabitsByUserId` from `@/lib/queries/habit` (re-export) or `habit-read` via existing barrel — match how other files import (`getArchivedHabits` pattern).
3. Parallel fetch: `getHabitsByUserId(userId)` + `getArchivedHabits(userId)` via `Promise.allSettled` + `logSpan` as today.
4. Map active habits to `HabitWithProgress` with `completionRate: 0`, `currentProgress: 0`, `skippedToday: false`, `streak: 0` (same as archived dummy).
5. Keep empty-state UI and `HabitTableClient` handoff unchanged.
6. Drop `externalId` from props **if** unused after the change; update `habits/page.tsx` call site accordingly. If removing the prop is messy, leave the prop but stop using it (prefer removal for honesty).

Timeout / DB-error handling: on active query failure, rethrow (no KV stale fallback). On archived failure, keep current soft-skip behavior.

**Verify**: `pnpm exec tsc --noEmit`

### Step 2: Lint + smoke

**Verify**: `pnpm exec biome check --write src/components/habits/HabitTable.tsx src/app/(dashboard)/habits/page.tsx`

Manually confirm no remaining `getHabitsWithProgress` under `HabitTable.tsx`.

## Test plan

- No mandatory new test if none exist for HabitTable
- If a storybook/story asserts progress columns on the list, update or leave — list UI has no progress columns today
- Regression signal: `grep getHabitsWithProgress src/components/habits/HabitTable.tsx` → no matches

## Done criteria

- [ ] `/habits` active list path does not call `getHabitsWithProgress` or `getHabitsCacheSnapshot`
- [ ] UI still lists active + archived habits with the same columns
- [ ] `pnpm exec tsc --noEmit` exit 0
- [ ] Scope respected

## STOP conditions

- `HabitTableClient` actually displays streak/progress (drift from audit) — STOP and report with line numbers
- `getHabitsByUserId` is not exported from the barrel the file should use — fix import via existing `habit.ts` re-exports; do not duplicate queries

## Maintenance notes

- If the habits list later shows streaks, introduce a dedicated light DTO or a scoped progress query — do not silently re-add full `getHabitsWithProgress`
- Dashboard remains the canonical progress consumer
