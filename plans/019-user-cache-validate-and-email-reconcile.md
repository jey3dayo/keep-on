# Plan 019: Validate user KV entries and reconcile email on cache hit

> **Executor instructions**: Follow this plan step by step. Run every verification. On STOP conditions, stop and report. Reviewer maintains `plans/README.md` if dispatched via improve execute.
>
> **Drift check**: `git diff --stat 0f714c1..HEAD -- src/lib/cache/user-cache.ts src/lib/user.ts src/lib/__tests__/user.test.ts src/schemas/user.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `0f714c1`, 2026-08-14

## Why this matters

1. `getUserFromCache` does `JSON.parse(cached) as User` with no schema check, while habits cache uses Valibot `safeParse`. Corrupt / drifted KV payloads can flow into `getCurrentUserId()` / `syncUser()`.
2. `syncUser` returns immediately on KV hit and never compares `cached.email` to Access `identity.email`, so IdP email changes wait until TTL (300s) before `reconcileExistingUser` runs.

## Current state

```ts
// src/lib/cache/user-cache.ts:27-29
const user = JSON.parse(cached) as User
logInfo('user.cache:hit', { externalId })
return user
```

```ts
// src/lib/user.ts:131-135
const cached = await getUserFromCache(identity.sub)
if (cached) {
  return cached
}
```

`safeParseUser` is in `src/schemas/user.ts`. Habit-cache invalid-on-fail pattern: `habit-cache.ts:35-44` (safeParse → warn → treat as miss). Existing syncUser tests: `src/lib/__tests__/user.test.ts` (mocks `getUserFromCache`).

`reconcileExistingUser` already upserts when `existing.email !== identity.email` but only runs on cache miss path today.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Tests | `pnpm test:run -- src/lib/__tests__/user.test.ts src/lib/cache` | pass |
| Types | `pnpm exec tsc --noEmit` | exit 0 |
| Lint | `pnpm exec biome check --write src/lib/cache/user-cache.ts src/lib/user.ts src/lib/__tests__/user.test.ts` | exit 0 |

## Scope

**In scope**:

- `src/lib/cache/user-cache.ts`
- `src/lib/user.ts` — cache-hit email reconcile branch
- `src/lib/__tests__/user.test.ts`
- Optional small test file for `getUserFromCache` parse failure if easy to mock KV

**Out of scope**:

- Changing TTL values
- Settings concurrency / optimistic locking (`todo.txt` backlog)
- Habit cache schema changes

## Git workflow

- `fix(auth): validate user cache and reconcile email on hit`
- Do NOT push/PR unless asked

## Steps

### Step 1: Schema-validate user KV reads

In `getUserFromCache`:

1. `JSON.parse` inside try (already)
2. Run `safeParseUser(parsed)`
3. On failure: `logWarn('user.cache:invalid-data', …)`, `await kv.delete(key)` (best-effort), return `null`
4. On success: return `parseResult.output` (typed as User / UserSchemaType — match `setUserCache` input type; avoid `as User` if InferOutput is enough)

Match logging style of `habit-cache:invalid-data`.

**Verify**: `pnpm exec tsc --noEmit`

### Step 2: Email reconcile on cache hit

In `syncUser`, replace bare early return:

```ts
const cached = await getUserFromCache(identity.sub)
if (cached) {
  if (cached.email === identity.email) {
    return cached
  }
  await invalidateUserCache(identity.sub)
  // fall through to DB path — do not return cached
}
```

Then existing `fetchExistingUserWithRetry` + `reconcileExistingUser` runs. Import `invalidateUserCache` if not already imported in `user.ts`.

**Verify**: extend `src/lib/__tests__/user.test.ts`:

1. Cache hit + matching email → returns cached, **no** `getUserByExternalId`
2. Cache hit + mismatched email → calls invalidate (mock), then DB path / `upsertUser` as today's mismatch test

Mock `invalidateUserCache` alongside existing user-cache mocks.

### Step 3: Lint + run tests

**Verify**: `pnpm test:run -- src/lib/__tests__/user.test.ts` and biome on touched files.

## Test plan

- Pattern: existing `syncUser` suite in `src/lib/__tests__/user.test.ts`
- Cases listed in Step 2
- Optional: invalid JSON / invalid shape → `getUserFromCache` returns null (if KV mock harness is cheap)

## Done criteria

- [ ] Invalid user KV payloads never return a forged User
- [ ] Cache hit with email mismatch triggers invalidate + reconcile path
- [ ] Cache hit with matching email still avoids DB (`getUserByExternalId` not called)
- [ ] Tests + tsc green
- [ ] Scope respected

## STOP conditions

- `safeParseUser` rejects legitimate cached shapes (e.g. date serialization) — fix schema tolerance for KV round-trip **within** `UserSchema` / parse path; if that requires broad type changes, STOP
- Email mismatch on hit should claim-by-email instead of reconcile — only if externalId row missing; fall-through already handles via existing miss path

## Maintenance notes

- Reviewers: ensure invalidate + fall-through cannot loop (getUserFromCache must return null after invalidate)
- Keep habit-cache and user-cache validation patterns aligned
