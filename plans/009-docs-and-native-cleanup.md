# Plan 009: Fix onboarding docs drift and drop unused @typescript/native

> **Executor instructions**: Docs/deps cleanup only. Do not change application runtime code. Reviewer maintains plans/README index if dispatched.
>
> **Drift check**: `git diff --stat d5df968..HEAD -- AGENTS.md README.md todo.txt done.txt package.json pnpm-lock.yaml .claude/rules/dotenvx.md .claude/rules/database-migration.md DESIGN_REVIEW.md plans/README.md`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `d5df968`, 2026-08-13

## Why this matters

`AGENTS.md` still tells agents to run `pnpm db:push`, which does not exist — day-one schema sync fails. Product/README/plans index still describe shipped features as TODO or claim E2E has zero specs. `@typescript/native` duplicates already-installed `typescript@^7.0.2`. 当時のタスク管理文書では TS7/jsdom を未対応 major として扱っている。

## Current state

- `AGENTS.md:63` — `pnpm db:push`
- `.claude/rules/dotenvx.md:75` — `pnpm env:run -- pnpm db:push`
- `.claude/rules/database-migration.md` — multiple `db:push` / `db:migrate` references
- Real scripts in `package.json`: `db:generate`, `db:migrate:local`, `db:migrate:remote`, `db:studio`
- README already documents migrate scripts correctly (`README.md:92-93`)
- The former product-status document described calendar as「将来実装予定」although `HabitCalendarHeatmap` ships; README now owns the corrected product status, including skip
- `README.md:275-283` — unchecked offline SW etc. while SW exists; reminder delivery still missing
- `plans/README.md` — still says E2E 0 specs / plans uncommitted / test typecheck hole without quarantine note
- `DESIGN_REVIEW.md:42` — `@/components/Input` (wrong; should be `@/components/basics/Input`)
- `package.json:104` — `"@typescript/native": "npm:typescript@^7.0.2"` unused; `typescript` and `jsdom` already at 7 / 30
- 当時のタスク管理文書 — stale major-update backlog

## Commands

| Purpose | Command | Expected |
| --------- | --------- | ---------- |
| Drop dep | `pnpm remove @typescript/native -D` | exit 0, lockfile updates |
| Types sanity | `pnpm exec tsc --noEmit` | exit 0 |
| Markdown lint (touched) | `pnpm exec markdownlint-cli2 --no-globs --fix <md files>` | exit 0 or only pre-existing issues |

## Scope

**In scope**:

- `AGENTS.md`
- `.claude/rules/dotenvx.md`
- `.claude/rules/database-migration.md` (replace nonexistent scripts with generate + migrate:local/remote; keep historical migration doc intent)
- `README.md` (calendar shipped; add skip to core features; leave notifications/social/guest as future)
- `README.md` (「次のステップ」only — check off limited offline; split reminderTime storage vs push delivery)
- `plans/README.md` (append 2026-08-13 section for 007+; fix stale leftovers about E2E 0 / uncommitted / typecheck; keep history of 001–006)
- `DESIGN_REVIEW.md` (Input path fix)
- `todo.txt` / `done.txt` (rewrite TS7/jsdom section: majors landed; remaining is remove native alias + optional dual TS6 API note)
- `package.json` / `pnpm-lock.yaml` via `pnpm remove @typescript/native -D`

**Out of scope**: `docs/migrations/2026-01-25-prisma-to-drizzle.md` historical narrative (optional one-line note OK if you touch it; not required), any `src/**` code, installing new deps

## Git workflow

- Branch: `advisor/009-docs-and-native-cleanup`
- Commits may split docs vs dep removal
- Do NOT push

## Steps

### Step 1: Fix db:push references

Replace with the real flow used in README.md and AGENTS.md, e.g.:

1. `pnpm db:generate`
2. `pnpm db:migrate:local`

Update AGENTS development steps and the two rule files accordingly.

**Verify**: `rg "db:push|pnpm db:migrate[^-]" AGENTS.md .claude/rules/dotenvx.md .claude/rules/database-migration.md` → no matches for nonexistent scripts (allow comments that say the old name was removed).

### Step 2: Product + README + DESIGN_REVIEW + plans index

- README.md: the former product-status document is corrected so calendar is shipped on habit detail; document skip; keep 通知 as future
- README next steps: offline limited = done; reminder **delivery** remains TODO
- DESIGN_REVIEW: `@/components/basics/Input`
- plans/README: note 001–006 DONE on main; E2E smoke exists but write-path not gated; typecheck gate exists with quarantine in todo.txt; add rows for 007–013 as TODO

**Verify**: spot-check the corrected sentences exist.

### Step 3: Remove `@typescript/native` and refresh task tracking

Run `pnpm remove @typescript/native -D`. Keep `@typescript/typescript6` (used by `scripts/lib/extract-jsdoc.ts`).

Update `todo.txt` / `done.txt` major-update entries to reflect current truth.

**Verify**: `pnpm exec tsc --noEmit` exit 0; `rg "@typescript/native" package.json` no matches

## Done criteria

- [ ] No live docs prescribe `pnpm db:push`
- [ ] product/README/plans/DESIGN_REVIEW drift fixed as above
- [ ] `@typescript/native` removed; lockfile consistent
- [ ] No `src/**` changes

## STOP conditions

- `pnpm remove` fails due to workspace policy / age gate — report without force-exemptions
- Removing native breaks a script that imports `@typescript/native` (search first)

## Maintenance notes

- Agents read AGENTS.md first — keep scripts in sync with package.json forever.
