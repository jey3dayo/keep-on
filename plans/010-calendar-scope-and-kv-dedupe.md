# Plan 010: Scope calendar reads by userId and stop double KV snapshot reads

> **Executor instructions**: Follow steps in order. Reviewer maintains plans/README if dispatched.
>
> **Drift check**: `git diff --stat d5df968..HEAD -- src/lib/queries/habit-calendar.ts src/app/(dashboard)/habits/[id]/page.tsx src/lib/queries/habit-read.ts src/app/(dashboard)/dashboard/page.tsx src/components/habits/HabitTable.tsx src/lib/cache/habit-cache.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW–MED
- **Depends on**: none (file-disjoint from 007/008)
- **Category**: security / perf
- **Planned at**: commit `d5df968`, 2026-08-13

## Why this matters

`getHabitCalendarData(habitId)` has no `userId` predicate — defense relies on the page. Habit detail even fetches calendar in parallel before ownership checks. Separately, dashboard/habits read the KV snapshot, then `getHabitsWithProgress` reads it again.

## Current state

```ts
// habit-calendar.ts:19-39 — habitId only
export async function getHabitCalendarData(habitId: string): Promise<HabitCalendarData>
```

```ts
// habits/[id]/page.tsx:39-42
const [habit, calendarData] = await Promise.all([
  getHabitById(id),
  getHabitCalendarData(id),
])
```

```ts
// dashboard/page.tsx:54-63 — snapshot then getHabitsWithProgress
// habit-read.ts:190 — getHabitsCacheSnapshot again
```

Cache helpers: `src/lib/cache/habit-cache.ts`. Layer rule: queries do Drizzle; pages orchestrate (`.claude/rules/directory-structure.md`).

## Commands

| Purpose | Command | Expected |
| --------- | --------- | ---------- |
| Types | `pnpm exec tsc --noEmit` | exit 0 |
| Tests | `pnpm test:run -- src/lib/queries src/components/habits` | pass (or focused new tests) |
| Lint | `pnpm exec biome check --write <touched>` | exit 0 |

## Scope

**In scope**:

- `src/lib/queries/habit-calendar.ts`
- `src/app/(dashboard)/habits/[id]/page.tsx`
- Callers of `getHabitCalendarData` (update all)
- `src/lib/queries/habit-read.ts` — accept optional preloaded snapshot OR skip internal read when snapshot passed
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/habits/HabitTable.tsx`
- Tests for calendar ownership if a query test file is natural; otherwise a small unit test on the query helper

**Out of scope**: analytics rewrite (plan 013), habit-read god-module split, DashboardWrapper client code, changing cache key schema

## Git workflow

- Branch: `advisor/010-calendar-scope-and-kv-dedupe`
- Commit messages: `fix(habits): scope calendar queries by userId` / `perf(habits): reuse habits cache snapshot`
- Do NOT push

## Steps

### Step 1: Require userId on calendar query

Change signature to `getHabitCalendarData(habitId: string, userId: string)`.

Filter checkins/skips via join on `habits` (`habits.userId = userId` and `habits.id = habitId`) **or** equivalent `and(eq(checkins.habitId, habitId), ...)` only after verifying habit ownership inside the query (prefer SQL join so a wrong habitId returns empty, not other users' data).

Update habit detail page: either (a) fetch habit first, gate ownership, then calendar with `userId`, or (b) pass `userId` into scoped calendar in parallel **and** still gate on habit ownership before render (scoped query makes parallel safe).

**Verify**: `rg "getHabitCalendarData\\(" src` — every call passes userId; `tsc --noEmit` exit 0

### Step 2: Deduplicate KV snapshot read

Preferred approach (minimal API churn):

- Add optional argument to `getHabitsWithProgress`, e.g. `cacheSnapshot?: HabitsCacheSnapshot | null` (use the existing type from habit-cache).
- When provided, skip the internal `getHabitsCacheSnapshot` call and use the provided value for hit/stale logic.
- When omitted, keep current behavior (internal read) for other callers.

Update `dashboard/page.tsx` and `HabitTable.tsx` to pass the snapshot they already loaded.

**Verify**: only one `getHabitsCacheSnapshot` per request path in those pages (read the code); existing cache-hit behavior unchanged; `tsc --noEmit` exit 0

### Step 3: Tests + format

If easy, add a query test proving calendar returns empty for wrong userId (sqlite helper pattern from `checkin-sql.test.ts` is ideal but not mandatory if too heavy — at minimum typecheck + existing tests).

**Verify**: focused tests + biome

## Done criteria

- [ ] Calendar query requires userId and cannot return another user's rows
- [ ] Detail page does not rely on unscoped calendar fetch
- [ ] Dashboard/HabitTable do not double-read KV on the happy path
- [ ] No out-of-scope files

## STOP conditions

- Passing snapshot into `getHabitsWithProgress` would break stale-fallback semantics — stop and report rather than inventing a third cache API
- Join against habits table is awkward due to schema — report alternate with evidence

## Maintenance notes

- Any new calendar consumer must pass userId.
- Optional snapshot param should stay optional so analytics/other callers keep working.
