# Plan 016: Unify habit ownership errors so clients cannot enumerate resources

> **Executor instructions**: Follow this plan step by step. Run every verification. On STOP conditions, stop and report. Reviewer maintains `plans/README.md` if dispatched via improve execute.
>
> **Drift check**: `git diff --stat 0f714c1..HEAD -- src/app/actions/habits/utils.ts src/app/actions/habits/checkin-shared.ts src/app/actions/habits/reset.ts src/lib/errors/serializable.ts src/app/actions/habits/__tests__/`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0f714c1`, 2026-08-14

## Why this matters

Authenticated callers can distinguish missing habits, other users' habits, and archived habits via `NotFoundError` vs `AuthorizationError` and via distinct Japanese `detail` strings serialized to the client. That enables habitId enumeration and state probing. Check-in paths already map missing → `AuthorizationError`, but still leak distinct messages; `requireOwnedHabit` still returns `NotFoundError` for missing rows.

## Current state

```ts
// src/app/actions/habits/utils.ts:70-81
export async function requireOwnedHabit(habitId: string, userId: string): HabitActionResult<HabitRecord> {
  const habit = await getHabitById(habitId)
  if (!habit) {
    return actionError(serializeHabitError(new NotFoundError()))
  }
  if (habit.userId !== userId) {
    return actionError(serializeHabitError(new AuthorizationError()))
  }
  return actionOk(habit)
}
```

```ts
// src/app/actions/habits/checkin-shared.ts:65-72
if (!habit) {
  throw new AuthorizationError({ detail: '習慣が見つかりません' })
}
if (habit.userId !== userId) {
  throw new AuthorizationError({ detail: 'この習慣にアクセスする権限がありません' })
}
if (habit.archived) {
  throw new AuthorizationError({ detail: 'アーカイブされた習慣は操作できません' })
}
```

Same three details in `reset.ts:33-40`. `serializeHabitError` passes `AuthorizationError.message` to the client (`serializable.ts:24-28`).

Existing tests assert `NotFoundError` for missing habits in archive/delete/unarchive/update (`__tests__/archive.test.ts` etc.) and only `AuthorizationError` name (not message) in `checkin-shared.test.ts` / `reset.test.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Tests | `pnpm test:run -- src/app/actions/habits src/lib/errors` | all pass |
| Types | `pnpm exec tsc --noEmit` | exit 0 |
| Lint | `pnpm exec biome check --write <touched>` | exit 0 |

## Scope

**In scope**:

- `src/app/actions/habits/utils.ts` — `requireOwnedHabit` (+ any nearby helper)
- `src/app/actions/habits/checkin-shared.ts`
- `src/app/actions/habits/reset.ts`
- `src/lib/errors/habit.ts` and/or `serializable.ts` only if adding a single public client message constant
- Tests under `src/app/actions/habits/__tests__/` that assert `NotFoundError` for missing-owned cases
- Optionally `src/lib/errors/__tests__/serializable.test.ts` if serialization behavior changes

**Out of scope**:

- Changing ValidationError / UnauthorizedError shapes
- New action coverage from plan 011 (checkin/skip/create full suites) — only adjust assertions touched by this fix
- UI toast copy unrelated to these errors

## Git workflow

- `fix(habits): unify ownership error responses`
- Do NOT push/PR unless asked

## Steps

### Step 1: Define one client-facing authorization message

Add a shared constant (prefer next to errors or in `checkin-shared` + export from one place):

```ts
export const HABIT_AUTHORIZATION_CLIENT_MESSAGE = 'この操作を実行する権限がありません'
```

Use it for **all** ownership failures returned to clients (missing, wrong owner, archived). Server logs may still include a reason via `logWarn` with a `reason` field (`not_found` | `forbidden` | `archived`) — do not put that reason in `AuthorizationError.detail`.

### Step 2: Fix `requireOwnedHabit`

- Missing habit → `AuthorizationError` with the shared client message (not `NotFoundError`)
- Wrong owner → same `AuthorizationError` + same message

Keep `NotFoundError` only where the resource is known to belong to the user but a secondary lookup fails (audit `utils.ts` ~118 and `update.ts` — if those are ownership-adjacent, unify; if truly "owned but missing mid-flight", STOP and report rather than inventing).

### Step 3: Fix checkin-shared + reset

Replace the three distinct `detail` strings with the single constant (still throw `AuthorizationError`). Prefer `logWarn('habits.authorize:denied', { reason, habitId, userId })` before throw when easy.

### Step 4: Update tests

- `archive` / `delete` / `unarchive` / `update` tests that expect `NotFoundError` for missing id → expect `AuthorizationError`
- Add or adjust one test that missing vs other-owner vs archived produce **identical** `result.error` (same `name` + same `message`) for `requireHabitForUserWithRetry` or `requireOwnedHabit`
- Do not assert the old Japanese detail strings

**Verify**: `pnpm test:run -- src/app/actions/habits`

## Test plan

- Enumeration indistinguishability: three denial causes → one serialized shape
- Existing happy-path tests remain green
- Pattern: `src/app/actions/habits/__tests__/checkin-shared.test.ts`

## Done criteria

- [ ] `requireOwnedHabit` never returns `NotFoundError` for missing habitId
- [ ] checkin-shared / reset do not expose distinct client messages for not_found / forbidden / archived
- [ ] Tests updated and passing
- [ ] `pnpm exec tsc --noEmit` exit 0
- [ ] Scope respected

## STOP conditions

- A caller depends on `NotFoundError` to drive UX that must stay distinct (e.g. edit page "create?") — report with file:line; do not partially unify
- `formatSerializableError` consumers break on message change — update them within scope or STOP

## Maintenance notes

- New habit mutations should go through `requireOwnedHabit` / `requireHabitForUserWithRetry` and must not reintroduce distinct client details
- Plan 011 should assert identical denial payloads when it lands
