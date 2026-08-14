# Plan 018: Invalidate habits cache on weekStart change and revalidate habit routes

> **Executor instructions**: Follow this plan step by step. Run every verification. On STOP conditions, stop and report. Reviewer maintains `plans/README.md` if dispatched via improve execute.
>
> **Drift check**: `git diff --stat 0f714c1..HEAD -- src/lib/queries/user-settings.ts src/app/actions/settings/updateUserSettings.ts src/app/actions/habits/utils.ts src/app/actions/settings/__tests__/ src/app/actions/habits/__tests__/`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW–MED (broader `revalidatePath`)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0f714c1`, 2026-08-14

## Why this matters

1. `updateWeekStartAndCache` only calls `invalidateUserCache(externalId)`. Habits KV (`habits:user:{userId}`, TTL 180s) stores `HabitWithProgress` whose weekly/monthly boundaries depend on `weekStart`, but the cache key has **no** weekStart dimension — users keep wrong progress for up to ~3 minutes after flipping week start.
2. `revalidateHabitPaths` only `revalidatePath('/dashboard')`. Mutations leave `/habits` and `/analytics` RSC payloads stale until navigation/TTL.

## Current state

```ts
// src/lib/queries/user-settings.ts:181-183
if (externalId) {
  try {
    await invalidateUserCache(externalId)
```

```ts
// src/app/actions/habits/utils.ts:176-180
export async function revalidateHabitPaths(userId: string, options: { sync?: boolean } = {}) {
  revalidatePath('/dashboard')
  // then invalidateHabitsCache + invalidateAnalyticsCache
}
```

```ts
// src/app/actions/settings/updateUserSettings.ts:32-33
revalidatePath('/dashboard')
revalidatePath('/settings')
```

`invalidateHabitsCache(userId)` lives in `src/lib/cache/habit-cache.ts`. Settings update has `userId` in scope inside `updateUserSettings` / `updateWeekStartAndCache`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Tests | `pnpm test:run -- src/app/actions/settings src/app/actions/habits/__tests__/utils` (adjust to existing test paths) | pass |
| Types | `pnpm exec tsc --noEmit` | exit 0 |
| Lint | `pnpm exec biome check --write <touched>` | exit 0 |

## Scope

**In scope**:

- `src/lib/queries/user-settings.ts` — invalidate habits (and analytics if period totals can shift) after weekStart write
- `src/app/actions/settings/updateUserSettings.ts` — revalidate `/habits` + `/analytics` when settings change (weekStart affects progress displays)
- `src/app/actions/habits/utils.ts` — extend `revalidateHabitPaths`
- Tests that mock `revalidatePath` / `invalidateHabitsCache` (update expected call lists)

**Out of scope**:

- Adding weekStart into the habits cache key (invalidation is enough for S)
- Plan 013 analytics query collapse
- Client-only router.refresh changes

## Git workflow

- `fix(cache): invalidate habits on weekStart and revalidate habit routes`
- Do NOT push/PR unless asked

## Steps

### Step 1: Invalidate habits KV on weekStart update

In `updateWeekStartAndCache`, after successful `updateUsersWeekStartWithRetry`, when you have `userId` (always) and optionally `externalId`:

1. Keep `invalidateUserCache(externalId)` when `externalId` is present.
2. Add `await invalidateHabitsCache(userId)` (import from `@/lib/cache/habit-cache`).
3. Also `invalidateAnalyticsCache(userId)` if analytics aggregates can depend on week boundaries — prefer yes for consistency with `revalidateHabitPaths` comments; use dynamic import pattern already used in `utils.ts` or static import — match file style.

Cache invalidation failures stay non-fatal (log/warn, do not throw), matching existing user-cache try/catch.

**Verify**: `pnpm exec tsc --noEmit`

### Step 2: Broaden path revalidation

In `revalidateHabitPaths`:

```ts
revalidatePath('/dashboard')
revalidatePath('/habits')
revalidatePath('/analytics')
```

Do **not** add dynamic `/habits/[id]` unless you confirm Next.js version needs it for this app's detail pages; static `/habits` is the minimum. If detail pages stay stale in manual check, add `revalidatePath('/habits', 'layout')` only if supported — otherwise STOP and report rather than guessing API.

In `updateUserSettingsAction` after successful update:

```ts
revalidatePath('/dashboard')
revalidatePath('/settings')
revalidatePath('/habits')
revalidatePath('/analytics')
```

**Verify**: update action tests' `revalidatePath` mock call expectations.

### Step 3: Tests

- Settings action test: expect `revalidatePath` includes `/habits` and `/analytics`
- If habits utils tests assert `revalidatePath` once, update to three paths
- If no direct test for `updateWeekStartAndCache`, add a focused unit test with mocked `invalidateHabitsCache` **or** assert via settings action mocks if the invalidate is only inside query layer — mocking `@/lib/cache/habit-cache` in a query test is ideal; keep effort S

**Verify**: `pnpm test:run -- src/app/actions/settings`

## Test plan

- Mock call counts for invalidate + revalidatePath
- Pattern: `src/app/actions/settings/__tests__/updateUserSettings.test.ts`

## Done criteria

- [ ] weekStart success path calls `invalidateHabitsCache(userId)`
- [ ] `revalidateHabitPaths` revalidates `/dashboard`, `/habits`, `/analytics`
- [ ] settings action revalidates the same habit-facing routes
- [ ] Tests + `tsc` green
- [ ] Scope respected

## STOP conditions

- `updateWeekStartAndCache` no longer exists / weekStart moved — adapt only within settings module or STOP
- Next.js `revalidatePath` signature differs and layout revalidation is required for correctness — report with a minimal repro idea, do not upgrade Next

## Maintenance notes

- Reviewers: watch for extra RSC work on high-churn check-in paths — acceptable at current scale
- If habits cache later keys by weekStart, this invalidation remains correct (redundant but safe)
