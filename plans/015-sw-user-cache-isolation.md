# Plan 015: Stop serving cached user HTML on SW network failure; harden sign-out purge

> **Executor instructions**: Follow this plan step by step. Run every verification. On STOP conditions, stop and report. Reviewer maintains `plans/README.md` if dispatched via improve execute.
>
> **Drift check**: `git diff --stat 0f714c1..HEAD -- public/sw.js src/components/dashboard/SiteHeader.tsx src/components/pwa/ServiceWorkerRegistration.tsx src/constants/pwa.ts src/lib/pwa/`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (pairs with 014 conceptually; no code dependency)
- **Category**: security
- **Planned at**: commit `0f714c1`, 2026-08-14

## Why this matters

`public/sw.js` network-first-caches `/dashboard`, `/habits`, `/analytics`. On `fetch` throw (and on some non-ok responses) it returns `cache.match(request)` — prior user's authenticated HTML. Sign-out only `postMessage(CLEAR_USER_CACHE)` to `navigator.serviceWorker.controller`; if there is no controller, purge never runs. Shared-device / user-switch + offline then leaks habit names and progress.

## Current state

```js
// public/sw.js:170-192 (cacheable navigate)
try {
  const networkResp = await fetch(request)
  // ...
  if (networkResp.ok && !networkResp.redirected) {
    await cache.put(request, networkResp.clone())
    return networkResp
  }
  return cached || networkResp
} catch {
  return cached || caches.match(OFFLINE_URL)
}
```

```js
// public/sw.js:314-322
if (event.data?.type === 'CLEAR_USER_CACHE') {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => clearUserData(cache)))
}
```

```ts
// SiteHeader.tsx:25-37
function requestUserCacheClear(): void {
  navigator.serviceWorker?.controller?.postMessage({ type: SW_MSG_CLEAR_USER_CACHE })
}
// handleSignOut: clearLocalIdentityCache(); requestUserCacheClear(); location.assign(ACCESS_LOGOUT_URL)
```

`CACHE_NAME = 'keepon-v5'`, `CACHEABLE_ROUTES = ['/dashboard', '/habits', '/analytics']` (sw.js:2-9). Message type string must stay in sync with `src/constants/pwa.ts` (`SW_MSG_CLEAR_USER_CACHE`).

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Lint TS | `pnpm exec biome check --write src/constants/pwa.ts src/components/dashboard/SiteHeader.tsx src/lib/pwa/clear-user-caches.ts src/lib/pwa/__tests__/clear-user-caches.test.ts` | exit 0 |
| Types | `pnpm exec tsc --noEmit` | exit 0 |
| Tests | `pnpm test:run -- src/lib/pwa` | all pass |

## Scope

**In scope**:

- `public/sw.js`
- `src/constants/pwa.ts` — export `SW_CACHE_NAME` + `SW_USER_CACHEABLE_ROUTE_PREFIXES` (document sync with sw.js)
- `src/lib/pwa/clear-user-caches.ts` (create) — client fallback purge via Cache API
- `src/lib/pwa/__tests__/clear-user-caches.test.ts` (create)
- `src/components/dashboard/SiteHeader.tsx` — call fallback purge on sign-out
- `src/components/pwa/ServiceWorkerRegistration.tsx` — use same helper on user switch / sign-out detection (optional but preferred for one path)

**Out of scope**:

- Rewriting Background Sync replay loop
- Plan 014 identity policy
- Changing Access logout URL
- Full SW Vitest browser harness (extract pure helpers only if needed; SW behavior change is validated by review + optional comment)

## Git workflow

- Branch: `advisor/015-sw-user-cache-isolation` or shared improve branch
- Commits: `fix(pwa): …`
- Do NOT push/PR unless asked

## Steps

### Step 1: Constants for cache name / routes

In `src/constants/pwa.ts` add (and comment "must match public/sw.js"):

```ts
export const SW_CACHE_NAME = 'keepon-v5' as const
export const SW_USER_CACHEABLE_ROUTE_PREFIXES = ['/dashboard', '/habits', '/analytics'] as const
```

In `public/sw.js`, add a one-line comment pointing at those constants; keep the string literals identical (SW is not bundled from TS). **Do not invent a build step.**

**Verify**: grepping both files shows the same three prefixes and `keepon-v5`.

### Step 2: SW — never fall back to user HTML on network failure

For cacheable navigate handler:

1. On `catch`: `return caches.match(OFFLINE_URL)` only (do **not** return `cached`).
2. When `networkResp` is not ok or redirected: do **not** return `cached`. Return `networkResp` (auth failure / error). Optionally still `clearUserCache` on `isAuthNavigationFailure` (already done).

Bump `CACHE_NAME` to `keepon-v6` **and** `SW_CACHE_NAME` so old user HTML entries are orphaned and eventually dropped. Update both files together.

**Verify**: manual read of the navigate branch — `cached` is unused on failure paths (may still be read for logging; prefer removing unused `cached` match if biome/biome-js doesn't apply to sw.js).

### Step 3: Client fallback purge helper

Create `src/lib/pwa/clear-user-caches.ts`:

```ts
import { SW_CACHE_NAME, SW_MSG_CLEAR_USER_CACHE, SW_USER_CACHEABLE_ROUTE_PREFIXES } from '@/constants/pwa'

export async function clearUserCachesBestEffort(): Promise<void> {
  navigator.serviceWorker?.controller?.postMessage({ type: SW_MSG_CLEAR_USER_CACHE })
  if (!('caches' in globalThis)) return
  try {
    const cache = await caches.open(SW_CACHE_NAME)
    const keys = await cache.keys()
    await Promise.all(
      keys
        .filter((req) =>
          SW_USER_CACHEABLE_ROUTE_PREFIXES.some((p) => new URL(req.url).pathname.startsWith(p))
        )
        .map((req) => cache.delete(req))
    )
  } catch {
    // best-effort
  }
}
```

Wire `SiteHeader` `handleSignOut` to `void clearUserCachesBestEffort()` (keep `clearLocalIdentityCache()`). Prefer awaiting with a short timeout only if easy; default fire-and-forget then `location.assign` is OK if Cache API delete is started first.

Also replace raw `postMessage` in `ServiceWorkerRegistration` user-switch effect with the same helper.

**Verify**: `pnpm exec tsc --noEmit`

### Step 4: Unit test the pathname filter

If you extract `isUserCacheablePathname(pathname: string): boolean` next to the helper, test:

- `/dashboard` true, `/habits/xyz` true, `/analytics` true
- `/offline` false, `/api/me` false, `/settings` false

Mock `caches` in vitest if testing `clearUserCachesBestEffort`; otherwise testing the pure predicate is enough.

**Verify**: `pnpm test:run -- src/lib/pwa`

## Test plan

- New pure tests for route prefix matching
- No Playwright requirement in this plan
- Reviewer should note UX change: offline navigate to `/dashboard` shows `/offline` instead of last HTML

## Done criteria

- [ ] Cacheable navigate `catch` does not return user `cached` HTML
- [ ] Non-ok network responses do not fall back to user `cached` HTML
- [ ] `CACHE_NAME` / `SW_CACHE_NAME` bumped in lockstep
- [ ] Sign-out path runs Cache API fallback even without `controller`
- [ ] `pnpm exec tsc --noEmit` + focused tests pass
- [ ] Scope respected

## STOP conditions

- Product owner rejects losing offline dashboard HTML — stop and report; do not add session-token crypto without a new plan
- `SiteHeader` already diverged heavily from excerpt (uncommitted UI work may exist on working tree — **do not** mix unrelated ThemeToggle/DESIGN edits into this change)
- Need to clear IndexedDB from the client without SW — only if SW message path is proven dead; then mirror `clearOfflineQueue` carefully or STOP

## Maintenance notes

- Any new authenticated route that caches user HTML must be added to **both** `sw.js` and `SW_USER_CACHEABLE_ROUTE_PREFIXES`
- Review: confirm production-only SW registration still clears on userId change via the shared helper
