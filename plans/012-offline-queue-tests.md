# Plan 012: Add direct IndexedDB tests for offline-queue

> **Executor instructions**: Add tests for `src/lib/pwa/offline-queue.ts`. Do not expand PWA feature scope. Reviewer maintains index.
>
> **Drift check**: `git diff --stat d5df968..HEAD -- src/lib/pwa/offline-queue.ts package.json vitest.config.ts`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW–MED
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `d5df968`, 2026-08-13

## Why this matters

Offline check-in persistence is core PWA behavior but only exercised through mocks. Queue corruption / userId discard bugs would not fail CI.

## Current state

- Implementation: `src/lib/pwa/offline-queue.ts` (`enqueueOfflineCheckin`, `getAllQueuedCheckins`, `removeQueuedCheckin`)
- Hook tests mock the entire module: `src/hooks/useOfflineCheckin.test.ts`
- No `fake-indexeddb` dependency yet; vitest uses jsdom (`package.json` has `jsdom`)

## Commands

- Tests: `pnpm test:run -- src/lib/pwa` → pass
- Install (only if needed): `pnpm add -D fake-indexeddb` → exit 0; respect `minimumReleaseAge` — if age gate fails, STOP and report (do not add to `minimumReleaseAgeExclude`)

## Scope

**In scope**: `src/lib/pwa/__tests__/offline-queue.test.ts` (new); optionally `vitest.setup` import for fake-indexeddb **only if** required and scoped; `package.json`/`pnpm-lock.yaml` only if adding fake-indexeddb

**Out of scope**: DashboardWrapper offline integration, SW changes, rewriting useOfflineCheckin tests beyond a single optional case

## Git workflow

- Branch: `advisor/012-offline-queue-tests`
- Commit: `test(pwa): cover offline checkin queue indexeddb`
- Do NOT push

## Steps

### Step 1: Choose IDB test strategy

Prefer `fake-indexeddb/auto` import at top of the new test file (local to the file) to avoid global setup churn. If jsdom already provides enough IDB, use that.

**Verify**: a smoke test can `enqueue` + `getAll` round-trip.

### Step 2: Cases

1. enqueue then getAll returns the item (including `userId`)
2. removeQueuedCheckin deletes by id
3. multiple items preserve identity

Optional: document that userId filtering lives in the hook/SW, not in this module — do not invent discard API here.

### Step 3: Run tests + biome

## Done criteria

- [ ] Direct tests for enqueue/getAll/remove pass without mocking the module under test
- [ ] No age-gate exclude hacks
- [ ] No production behavior changes unless a clear bug blocks testing (then STOP)

## STOP conditions

- Age gate blocks fake-indexeddb and jsdom IDB is insufficient — report alternatives
- Tests are flaky due to open DB handles — fix with the module's existing `db.close()` pattern; if still flaky after 2 tries, STOP

## Maintenance notes

- Hook tests can keep mocking the queue; this file is the contract for IDB.
