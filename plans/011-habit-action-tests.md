# Plan 011: Add Server Action tests for checkin / skip / reset / create

> **Executor instructions**: Test-only for habit mutation actions. Prefer implementing **after** plan 007 if both land on one branch; if 007 is already merged into your worktree, cover the new gates. Reviewer maintains index.
>
> **Drift check**: `git diff --stat d5df968..HEAD -- src/app/actions/habits/`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: ideally 007 (gates exist to assert); can start against current HEAD with ownership/auth cases only
- **Category**: tests
- **Planned at**: commit `d5df968`, 2026-08-13

## Why this matters

Core product mutations (`addCheckinAction`, remove, skip, reset, create) have no action-layer tests. Only archive/delete/update/unarchive are covered. Auth and ownership regressions can ship green.

## Current state

- Tests present: `src/app/actions/habits/__tests__/{archive,delete,update,unarchive}.test.ts`
- Missing: checkin, remove-checkin, skip, reset, create
- Pattern: mock `@/lib/user`, `@/lib/queries/*`, `next/cache`; assert `result.ok` and error names

## Commands

| Purpose | Command | Expected |
| --------- | --------- | ---------- |
| Tests | `pnpm test:run -- src/app/actions/habits` | all pass |
| Test types | `pnpm test:types` | exit 0 |
| Lint | `pnpm exec biome check --write src/app/actions/habits/__tests__` | exit 0 |

## Scope

**In scope**: new files under `src/app/actions/habits/__tests__/` only (and tiny mock adjustments if an action imports unmocked modules that blow up — mock them, do not rewrite production code unless required for testability; if production rewrite seems needed, STOP)

**Out of scope**: E2E, offline-queue tests (012), changing action implementations (007's job)

## Git workflow

- Branch: `advisor/011-habit-action-tests`
- Commit: `test(habits): cover checkin skip reset create actions`
- Do NOT push

## Steps

### Step 1: checkin + remove-checkin tests

For each: unauthenticated → UnauthorizedError; other user's habit → AuthorizationError; happy path success (mock create/delete query).

If 007 is present: also archived + bad dateKey cases.

### Step 2: skip + reset tests

Same auth/ownership matrix. Reset mocks `deleteAllCheckinsByHabitAndPeriod`.

### Step 3: create tests

Unauthenticated + validation failure + success (mock createHabit query). Follow whatever validate path `create.ts` uses.

### Step 4: Run suite

**Verify**: `pnpm test:run -- src/app/actions/habits` and `pnpm test:types`

## Done criteria

- [ ] New tests exist for checkin, remove-checkin, skip, reset, create
- [ ] Auth and ownership cases covered at minimum
- [ ] No production code changes (or only trivial testability fixes documented in NOTES)

## STOP conditions

- Action pulls in Cloudflare/runtime that cannot be mocked like archive tests — report
- 007 not present and you feel forced to implement gates here — do not; write tests for current behavior only

## Maintenance notes

- Keep action tests focused on authz/validation/result mapping; SQL belongs in query tests.
