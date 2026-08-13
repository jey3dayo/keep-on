# Plan 007: Harden habit mutation dateKey, timezone, and archived gates

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat d5df968..HEAD -- src/validators/habit-action.ts src/app/actions/habits/checkin-shared.ts src/app/actions/habits/skip.ts src/app/actions/habits/reset.ts src/app/actions/habits/checkin.ts src/app/actions/habits/remove-checkin.ts src/app/(dashboard)/dashboard/DashboardWrapper.tsx src/lib/server/date.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `d5df968`, 2026-08-13

## Why this matters

Authenticated users can pass any valid calendar `dateKey` into checkin/skip/reset and rewrite streak history (including bulk delete via reset). Skip/reset also resolve "today" with bare `new Date()` (UTC on Workers) while checkin uses the client local `formatDateKey`, so JP users near midnight can land mutations on the wrong day. Archived habits are still mutable via Server Actions / `/api/checkin` even though the UI hides them.

## Current state

- `src/validators/habit-action.ts:41-50` — validates `dateKey` format only via `safeParseDateKey`; no range.
- `src/app/actions/habits/skip.ts:31` — `const targetDate = input.dateKey ?? new Date()`
- `src/app/actions/habits/reset.ts:38` — same fallback.
- `src/app/actions/habits/checkin.ts:32` — same fallback when `dateKey` omitted.
- `src/app/(dashboard)/dashboard/DashboardWrapper.tsx:463-464` — `addSkipAction(habitId)` with no dateKey; checkin path at `:402` sends `formatDateKey(new Date())`.
- `src/app/actions/habits/checkin-shared.ts:62-71` — ownership only; does not check `habit.archived`.
- `src/app/actions/habits/reset.ts:30-36` — ownership only; no archived check.
- `src/lib/server/date.ts:23-33` — `getServerDateKey()` uses `ko_tz` cookie when present.
- Exemplar error pattern: throw `ValidationError` / `AuthorizationError` from `@/lib/errors/habit` (see `src/lib/errors/habit.ts`). Action tests live under `src/app/actions/habits/__tests__/archive.test.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
| --------- | --------- | --------------------- |
| Typecheck | `pnpm exec tsc --noEmit` | exit 0 |
| Test types | `pnpm test:types` | exit 0 |
| Unit tests | `pnpm test:run -- src/validators src/app/actions/habits` | all pass |
| Lint touched | `pnpm exec biome check --write <touched files>` | exit 0 |

## Scope

**In scope**:

- `src/validators/habit-action.ts` (and new `src/validators/__tests__/habit-action.test.ts` if useful)
- `src/app/actions/habits/checkin-shared.ts`
- `src/app/actions/habits/skip.ts`
- `src/app/actions/habits/reset.ts`
- `src/app/actions/habits/checkin.ts`
- `src/app/actions/habits/remove-checkin.ts` (only if it shares the same dateKey fallback / gate path)
- `src/app/(dashboard)/dashboard/DashboardWrapper.tsx` (pass dateKey into skip only)
- New tests under `src/app/actions/habits/__tests__/` for checkin and/or skip covering: out-of-window dateKey, archived habit, missing dateKey resolution
- Optional small helper under `src/lib/server/` or `src/validators/` for the date window — keep it tiny

**Out of scope**:

- Existence-oracle unification (NotFound vs Authorization) — separate finding
- Changing offline queue schema
- Analytics / calendar / KV cache work
- E2E specs
- Committing is OK in the worktree per git workflow; do NOT push

## Git workflow

- Branch: `advisor/007-harden-habit-mutation-gates`
- Commits: conventional commits, e.g. `fix(habits): reject out-of-window dateKeys and archived mutations`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add server dateKey window validation

Add a helper (prefer extending `validateHabitActionInput` or a sibling exported from `habit-action.ts`) that, given a resolved `dateKey` string and a `todayKey` string from `getServerDateKey()`:

- Accepts `dateKey` in inclusive range **`[todayKey - 365 days, todayKey + 1 day]`**
- Rejects outside that range with `ValidationError` (`field: 'dateKey'`)

Rationale for the window (do not change without STOP): UI is today-only, but offline replay may submit a dateKey from days earlier; 365d matches the streak fetch bound from plan 004. `+1` covers clock skew / TZ edge.

Wire this after format validation, in the shared mutation path used by checkin/remove/skip **and** in `reset.ts` (which uses `validateHabitActionInput` directly).

When `dateKey` is omitted, resolve with `await getServerDateKey()` (not `new Date()`), then run the window check (always passes for today).

**Verify**: `pnpm exec tsc --noEmit` → exit 0

### Step 2: Reject archived habits in shared gate + reset

In `requireHabitForUserWithRetry`, after ownership checks, if `habit.archived === true`, throw `AuthorizationError` (or `ValidationError` if that matches nearby delete/archive precondition style — prefer consistency with delete's archived precondition messaging).

Mirror the same archived check in `reset.ts` before deleting checkins.

**Verify**: grep shows archived check in both `checkin-shared.ts` and `reset.ts`.

### Step 3: Align client skip with checkin dateKey

In `DashboardWrapper.tsx` `handleSkip`, pass `formatDateKey(new Date())` as the second arg to `addSkipAction` / `removeSkipAction` the same way checkin does.

**Verify**: `rg "addSkipAction\\(" src/app/(dashboard)/dashboard/DashboardWrapper.tsx` shows a dateKey argument.

### Step 4: Tests

Add or extend action tests (model after `archive.test.ts`):

1. checkin (or skip) with `dateKey` far in the future → `ValidationError`
2. checkin (or skip) with `dateKey` older than 365 days → `ValidationError`
3. checkin/skip/reset against `archived: true` habit → error (not success)
4. omit dateKey → uses server today path (mock `getServerDateKey` if needed) and succeeds for owned active habit

Mock Clerk/user/queries like existing action tests. Avoid `any` / type assertions; use partial mocks typed loosely via `vi.mocked` + satisfies or cast only at mock boundaries if the file already does (archive.test uses `as any` — do **not** introduce new `as any`; prefer `as HabitRecord`-style only if unavoidable, else match existing file style minimally).

**Verify**: `pnpm test:run -- src/app/actions/habits src/validators` → all pass

### Step 5: Format

**Verify**: `pnpm exec biome check --write` on all touched files → exit 0

## Test plan

- New action tests as in Step 4
- Existing archive/delete/update tests must still pass

## Done criteria

- [ ] Out-of-window dateKeys rejected on checkin/skip/reset paths
- [ ] Missing dateKey uses `getServerDateKey()`, not bare `new Date()`
- [ ] Archived habits cannot checkin/skip/reset
- [ ] Dashboard skip sends dateKey
- [ ] `pnpm exec tsc --noEmit` exit 0
- [ ] Focused unit tests pass
- [ ] No files outside scope modified
- [ ] `plans/README.md` status updated (unless reviewer maintains index)

## STOP conditions

- Offline/PWA code requires dateKeys older than 365 days to function (report; do not silently widen)
- `getServerDateKey` cannot be called from the validation site without breaking edge runtime (report)
- Fix appears to require changing `/api/checkin` request contract beyond calling into actions

## Maintenance notes

- If product later wants intentional backfill UI, widen the window in one place only (the helper).
- Reviewers: confirm offline replay of yesterday's dateKey still works within 365d.
