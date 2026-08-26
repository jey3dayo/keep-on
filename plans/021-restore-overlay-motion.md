# 021 — Radix の overlay motion utility を復旧し、共有 easing を導入する

- **Status**: TODO
- **Commit**: 5577aeb
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens / Missed opportunities
- **Estimated scope**: 1 file, global CSS-only diff

## Problem

Several interactive surfaces carry the class contract copied from shadcn/tailwindcss-animate, but this repository has no implementation for those utilities. The consumers are visible in the generated UI wrappers:

`src/components/ui/dropdown-menu.tsx:62-66`:

```tsx
<DropdownMenuPrimitive.Content
  className={cn(
    'z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin] data-[state=closed]:animate-out data-[state=open]:animate-in',
    className
  )}
```

The same unsupported `animate-in`, `animate-out`, `fade-*`, `zoom-*`, and `slide-*` utilities are used by `src/components/ui/alert-dialog.tsx:19-40`, `src/components/ui/sheet.tsx:22-43`, and `src/components/ui/tooltip.tsx:45-50`.

The project uses only Tailwind's PostCSS integration (`postcss.config.mjs:3-5`) and declares no animation plugin (`tailwind.config.ts:10-11`, `package.json:85-122`). The current generated stylesheet contains Tailwind's built-in `animate-pulse` and `transition-all`, but not `animate-in`, `fade-in-0`, `zoom-in-95`, or any of the `slide-in-*`/`slide-out-*` utilities. Therefore dropdowns, tooltips, AlertDialogs, and Sheets have no CSS entry/exit animation despite advertising one in their class strings. Vaul's drawer is excluded from this plan because it injects and owns its own animation contract.

There is also no project motion token. `src/app/globals.css:301-410` repeats the weak built-in `ease-out` keyword across custom surfaces, while `src/components/ui/sheet.tsx:34` relies on the default `ease-in-out`. The audit playbook calls for strong shared curves rather than near-identical hand-written values.

## Target

Add a repo-owned compatibility layer in `src/app/globals.css`; do not add a dependency and do not edit generated `src/components/ui/*` files. Place the following motion tokens in the existing `@theme inline` block so Tailwind's `ease-out` and `ease-in-out` utilities resolve to the shared curves:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Add the following global keyframes and utility compatibility rules after the theme block. `scale(0.95)` is used only when the existing content class includes `zoom-in-95`/`zoom-out-95`; an overlay that only has `fade-*` must remain at scale 1. The `transform` keyframe is deliberately used instead of the CSS individual `translate` property so AlertDialog's existing centering classes (`translate-x-[-50%] translate-y-[-50%]`) are not overwritten.

```css
@keyframes keep-on-motion-enter {
  from {
    opacity: var(--motion-enter-opacity, 0);
    transform: translate3d(
        var(--motion-enter-translate-x, 0),
        var(--motion-enter-translate-y, 0),
        0
      )
      scale(var(--motion-enter-scale, 1));
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes keep-on-motion-exit {
  from {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    opacity: var(--motion-exit-opacity, 0);
    transform: translate3d(
        var(--motion-exit-translate-x, 0),
        var(--motion-exit-translate-y, 0),
        0
      )
      scale(var(--motion-exit-scale, 1));
  }
}

@layer utilities {
  [class*='animate-in'][data-state='open']:not([data-vaul-drawer]):not([data-vaul-overlay]),
  [class*='animate-in'][data-state='instant-open']:not([data-vaul-drawer]):not([data-vaul-overlay]),
  [class*='animate-in'][data-state='delayed-open']:not([data-vaul-drawer]):not([data-vaul-overlay]) {
    animation: keep-on-motion-enter 200ms var(--ease-out) both;
  }

  [class*='animate-out'][data-state='closed']:not([data-vaul-drawer]):not([data-vaul-overlay]) {
    animation: keep-on-motion-exit 150ms var(--ease-out) both;
  }

  [class*='zoom-in-95'] {
    --motion-enter-scale: 0.95;
  }

  [class*='zoom-out-95'] {
    --motion-exit-scale: 0.95;
  }

  [class*='slide-in-from-top'] {
    --motion-enter-translate-y: -100%;
  }

  [class*='slide-in-from-bottom'] {
    --motion-enter-translate-y: 100%;
  }

  [class*='slide-in-from-left'] {
    --motion-enter-translate-x: -100%;
  }

  [class*='slide-in-from-right'] {
    --motion-enter-translate-x: 100%;
  }

  [class*='slide-out-to-top'] {
    --motion-exit-translate-y: -100%;
  }

  [class*='slide-out-to-bottom'] {
    --motion-exit-translate-y: 100%;
  }

  [class*='slide-out-to-left'] {
    --motion-exit-translate-x: -100%;
  }

  [class*='slide-out-to-right'] {
    --motion-exit-translate-x: 100%;
  }

  [class*='slide-in-from-top-2'] {
    --motion-enter-translate-y: calc(var(--spacing) * -2);
  }

  [class*='slide-in-from-bottom-2'] {
    --motion-enter-translate-y: calc(var(--spacing) * 2);
  }

  [class*='slide-in-from-left-2'] {
    --motion-enter-translate-x: calc(var(--spacing) * -2);
  }

  [class*='slide-in-from-right-2'] {
    --motion-enter-translate-x: calc(var(--spacing) * 2);
  }

  [class*='slide-in-from-left-1/2'] {
    --motion-enter-translate-x: -50%;
  }

  [class*='slide-in-from-top-[48%]'] {
    --motion-enter-translate-y: -48%;
  }

  [class*='slide-out-to-left-1/2'] {
    --motion-exit-translate-x: -50%;
  }

  [class*='slide-out-to-top-[48%]'] {
    --motion-exit-translate-y: -48%;
  }
}
```

The named `slide-*-2` rules must come after their corresponding generic `slide-*` rules so the dropdown's 0.5rem offset wins over the Sheet's 100% offset. The half/48% rules must likewise come after the generic rules. The `:not([data-vaul-drawer]):not([data-vaul-overlay])` exclusions in the actual enter/exit selectors preserve Vaul's own animation contract. Existing reduced-motion safety net at `src/app/globals.css:482-489` must remain after this block so it reduces the new animation to `0.01ms` without removing color/opacity comprehension.

Replace the bare `ease-out` keywords in the custom declarations at `src/app/globals.css:302,324,337-338,350-351,363-364,374,384,397-398,410,436,441` with `var(--ease-out)`. Keep the long-press active fill linear (`src/app/globals.css:329`) because it represents elapsed hold time, and keep layout/sidebar linear timing unchanged.

## Repo conventions to follow

- Global visual tokens belong in the existing `@theme inline` block in `src/app/globals.css:46-78`.
- Existing custom motion utilities are colocated in `src/app/globals.css:299-419`; extend that file rather than creating another global stylesheet.
- `src/components/ui/*` is generated shadcn/ui code and must not be edited directly.
- `src/app/globals.css:465-491` already owns the reduced-motion global safety net; preserve its ordering and intent.
- The existing `src/components/ui/dropdown-menu.tsx:65` transform-origin variable is the exemplar for trigger-anchored popover origin. Modal content remains centered and is not reported as an origin problem.

## Steps

1. Add the three exact easing tokens to the existing `@theme inline` block in `src/app/globals.css`.
2. Add `keep-on-motion-enter` and `keep-on-motion-exit` with the exact opacity/transform/scale values above.
3. Add the non-Vaul enter/exit selectors and all named/half-offset variable selectors above. Preserve selector ordering so specific dropdown and dialog offsets override the generic 100% values.
4. Replace only the listed raw `ease-out` declarations with `var(--ease-out)`. Do not change the linear hold-fill transition, sidebar layout timing, or Vaul's injected CSS.
5. Confirm the generated CSS now contains the compatibility rules and that no `src/components/ui/*` file or package manifest changed.

## Boundaries

- Do NOT edit `src/components/ui/dropdown-menu.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `tooltip.tsx`, or `drawer.tsx`.
- Do NOT add `tailwindcss-animate`, `tw-animate-css`, or any other dependency.
- Do NOT scale/fade Vaul's `[data-vaul-drawer]` or `[data-vaul-overlay]`; Vaul owns those transitions and Plan 022 relies on its 500ms completion callback.
- Do NOT remove the existing reduced-motion or reduced-transparency blocks.
- Do NOT use `transition: all`, `scale(0)`, or a transform that breaks AlertDialog centering.
- If Tailwind v4 rejects the custom CSS syntax or the generated selector is missing, stop and report the compiler output instead of editing generated UI primitives.

## Verification

- **Mechanical**: run `pnpm lint`, `pnpm test:types`, and `pnpm test:run`. Expected result: all pass and the generated CSS contains `keep-on-motion-enter`/`keep-on-motion-exit` plus the non-Vaul selectors.
- **Mechanical**: inspect the dev CSS or browser `getComputedStyle` for a theme dropdown, tooltip, AlertDialog, and RouteModal. Each content surface must report a non-empty animation name; the two Vaul data attributes must retain Vaul's own animation names.
- **Feel check**: open and close the theme dropdown and a tooltip; they should enter quickly with fade + 0.95 scale from the Radix transform origin, and exit faster without a center-origin pop.
- **Feel check**: open a destructive confirmation dialog and the bottom RouteModal; the dialog must remain centered, while the bottom surface must move from the bottom. Set animation playback to 10% to inspect the origin and direction.
- **Feel check**: enable `prefers-reduced-motion: reduce`; movement should collapse to the existing near-instant duration while opacity/color state remains understandable.
- **Done when**: all referenced Radix motion classes produce CSS, trigger-anchored origins remain intact, Vaul is unchanged, the shared curves are used by custom surfaces, and reduced-motion behavior remains non-destructive.
