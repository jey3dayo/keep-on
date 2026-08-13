# Plan 013: Collapse analytics redundant checkin round-trips

> **Executor instructions**: Performance refactor of analytics page reads. Preserve displayed metrics semantics. Reviewer maintains index.
>
> **Drift check**: `git diff --stat d5df968..HEAD -- src/app/(dashboard)/analytics/page.tsx src/lib/queries/`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `d5df968`, 2026-08-13

## Why this matters

Analytics runs `getHabitsWithProgress` (already loads ~1y of checkins for streaks) **plus** today list, total count, and 7-day range aggregations — four D1 read paths per request.

## Current state

```ts
// analytics/page.tsx:70-87
const [habits, todayCheckins, totalCheckins, checkinsByDate] = await Promise.all([
  getHabitsWithProgress(...),
  getCheckinsByUserAndDate(user.id, dateKey),
  getTotalCheckinsByUserId(user.id),
  getCheckinCountsByDateRange(user.id, startDateKey, endDateKey),
])
```

Important semantic note from audit: **today's achievement count uses `todayCheckins.length` (raw checkin rows for the user that day), which is not necessarily `sum(habit.currentProgress)`**. Do not silently replace without verifying equality for multi-frequency habits.

## Commands

| Purpose | Command | Expected |
| --------- | --------- | ---------- |
| Types | `pnpm exec tsc --noEmit` | exit 0 |
| Tests | `pnpm test:run -- src/lib/queries` (and any new analytics test) | pass |
| Lint | biome on touched files | exit 0 |

## Scope

**In scope**: `src/app/(dashboard)/analytics/page.tsx`; optionally small helpers in `src/lib/queries/` for aggregates; tests for any new helper

**Out of scope**: changing the 7-day product window to week/month (direction finding — not this plan), habit-read module split, KV snapshot work (010)

## Git workflow

- Branch: `advisor/013-analytics-read-collapse`
- Commit: `perf(analytics): reduce duplicate checkin reads`
- Do NOT push

## Steps

### Step 1: Measure semantics

Read how `todayCheckins`, `totalCheckins`, and `checkinsByDate` are used in the JSX/metrics below line 87. Document in a short code comment or NOTES which metrics require raw queries.

### Step 2: Collapse safely

Acceptable strategies (pick one that preserves numbers):

A. Keep lightweight aggregate queries (`getTotalCheckinsByUserId`, `getCheckinCountsByDateRange`, today count) but **stop** calling `getHabitsWithProgress` if the page only needs habit names + progress that aggregates can supply — only if UI still works.
B. Keep `getHabitsWithProgress` for streak/progress UI, replace `getCheckinsByUserAndDate` with a count query or derive **only if** you prove `todayCheckins.length` equals a deriveable value for all period/frequency combos; otherwise keep one cheap today count query.
C. Add one combined SQL/query helper that returns `{ todayCount, totalCount, byDate }` in a single round-trip and delete the triple Promise.all arms.

Prefer C or B+C hybrid. Goal: fewer than 4 D1 round-trips without wrong stats.

### Step 3: Verify

Add a unit test for any new aggregate helper. Manually reason about multi-checkin-per-day habits.

**Verify**: `tsc --noEmit`; focused tests; biome

## Done criteria

- [ ] Analytics issues fewer redundant full checkin loads (evidence in code)
- [ ] Displayed metrics remain correct for daily habits with frequency > 1
- [ ] No unrelated refactors

## STOP conditions

- Deriving today count from `habits` progress would change the number users see — keep separate count query rather than ship a silent metric change
- Requires cache invalidation redesign

## Maintenance notes

- If direction work extends analytics ranges, reuse the combined aggregate helper with parameterized dates.
