# Plan 014: Do not restore stale identity from localStorage when the browser is online

> **Executor instructions**: Follow this plan step by step. Run every verification. On STOP conditions, stop and report. Reviewer maintains `plans/README.md` if dispatched via improve execute.
>
> **Drift check**: `git diff --stat 0f714c1..HEAD -- src/contexts/IdentityContext.tsx src/hooks/useOfflineCheckin.ts src/hooks/useOfflineCheckin.test.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0f714c1`, 2026-08-14

## Why this matters

When `fetch('/api/me')` throws, `IdentityProvider` always restores `ko_identity` from `localStorage`. If the browser is online but `/api/me` failed (transient server error, Access flake), a prior user's cached id can be restored. `useOfflineCheckin` then enqueues mutations under that stale id; replay against the live Access session returns 409 and drops the queue — optimistic UI lies and data is lost. True offline cold-start still needs cache restore; the guard is **online + fetch failure → clear**, **offline + fetch failure → restore**.

## Current state

```ts
// src/contexts/IdentityContext.tsx:86-96
const load = async () => {
  let res: Response
  try {
    res = await fetch('/api/me', { cache: 'no-store' })
  } catch {
    if (isCancelled) {
      return
    }
    // 真のネットワーク失敗だけキャッシュ復元。Access 割り込みはここに来ない
    setState({ isLoaded: true, userId: readCachedUserId() })
    return
  }
  // ...
}
```

`clearIdentityState` already exists (lines 35–38) and clears `ko_identity` + sets `userId: null`.

Enqueue already rejects missing userId (`useOfflineCheckin.ts:177-179`). No Identity unit tests today — add a small pure helper so the policy is testable without mounting React.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Tests | `pnpm test:run -- src/contexts src/hooks/useOfflineCheckin` | all pass |
| Types | `pnpm exec tsc --noEmit` | exit 0 |
| Lint | `pnpm exec biome check --write src/contexts/IdentityContext.tsx src/contexts/identity-cache-policy.ts src/contexts/__tests__/identity-cache-policy.test.ts` | exit 0 |

## Scope

**In scope**:

- `src/contexts/IdentityContext.tsx`
- `src/contexts/identity-cache-policy.ts` (create — pure helper)
- `src/contexts/__tests__/identity-cache-policy.test.ts` (create)

**Out of scope**:

- `public/sw.js` / sign-out Cache API purge → plan 015
- Changing `/api/me` or `/api/checkin` contracts
- Removing offline restore entirely

## Git workflow

- Branch: `advisor/014-identity-offline-cache-online-guard` (or shared improve branch)
- Commit style: `fix(auth): …` / `test(auth): …` (conventional, English subject)
- Do NOT push/PR unless the operator asked

## Steps

### Step 1: Add pure policy helper

Create `src/contexts/identity-cache-policy.ts`:

```ts
export type IdentityFetchFailureResolution =
  | { action: 'restore-cache' }
  | { action: 'clear' }

/** /api/me の fetch 自体が throw したときの localStorage 方針 */
export function resolveIdentityOnMeFetchFailure(online: boolean): IdentityFetchFailureResolution {
  return online ? { action: 'clear' } : { action: 'restore-cache' }
}
```

**Verify**: file exists; `pnpm exec tsc --noEmit` still green (or only unused until step 2).

### Step 2: Wire IdentityProvider

In the `catch` of `load()`:

1. `const online = typeof navigator !== 'undefined' ? navigator.onLine : true`
2. Call `resolveIdentityOnMeFetchFailure(online)`
3. If `clear` → `clearIdentityState(setState)`
4. If `restore-cache` → keep current behavior: `setState({ isLoaded: true, userId: readCachedUserId() })`

Update the comment to say: online なのに fetch 失敗はキャッシュを信じない。オフライン時のみ復元。

**Verify**: `pnpm exec biome check --write src/contexts/IdentityContext.tsx src/contexts/identity-cache-policy.ts`

### Step 3: Unit tests for the policy

Create `src/contexts/__tests__/identity-cache-policy.test.ts` modeled after simple pure tests (e.g. `src/schemas/user.test.ts`):

- `online: true` → `{ action: 'clear' }`
- `online: false` → `{ action: 'restore-cache' }`

**Verify**: `pnpm test:run -- src/contexts/__tests__/identity-cache-policy.test.ts` → pass

## Test plan

- New: `identity-cache-policy.test.ts` (2 cases above)
- Do not require React Testing Library for IdentityProvider in this plan

## Done criteria

- [ ] Online fetch failure clears `ko_identity` / sets `userId: null` via `clearIdentityState`
- [ ] Offline fetch failure still restores cached userId
- [ ] Policy unit tests pass
- [ ] `pnpm exec tsc --noEmit` exit 0
- [ ] No files outside scope modified
- [ ] `plans/README.md` status for 014 → DONE (reviewer if improve execute)

## STOP conditions

- `IdentityContext` fetch-failure path no longer matches the excerpt (already refactored)
- Product owner insists cold-start offline must enqueue before any successful `/api/me` **and** requires online failure to keep cache — report; do not invent a third state machine
- Fix appears to need SW changes — leave for 015

## Maintenance notes

- Reviewers: confirm `navigator.onLine` false-positives (browser says online, network dead) still clear cache — acceptable; user reloads when `/api/me` works
- Follow-up: optional `isVerified` flag for enqueue (deferred; 014 is the minimal guard)
