# 023 — テーマ切替タブの transition-all を視覚プロパティへ限定する

- **Status**: TODO
- **Commit**: 5577aeb
- **Severity**: LOW
- **Category**: Performance / Cohesion & tokens
- **Estimated scope**: 1 file, three class-string edits

## Problem

The generated Tabs primitive applies `transition-all`:

`src/components/ui/tabs.tsx:29-34`:

```tsx
<TabsPrimitive.Trigger
  ref={ref}
  className={cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
    className
  )}
```

`ThemeSettings` is the current consumer (`src/components/settings/ThemeSettings.tsx:62-82`). Its tab state changes only `background-color`, `color`, and `box-shadow`; `transition-all` also opts the control into unrelated future layout, transform, and geometry changes. The audit rule is to name the properties that are actually meant to interpolate.

The generated primitive must not be edited directly under the repository rule for `src/components/ui/`. Fortunately `TabsTrigger` merges the call-site class with `cn`, and `tailwind-merge` resolves `transition-all` in favor of a later `transition-[color,background-color,box-shadow]` class.

## Target

Add the following exact suffix to each of the three `TabsTrigger` class strings in `ThemeSettings.tsx`:

```tsx
className="relative flex-1 after:absolute after:-inset-y-2 after:content-[''] transition-[color,background-color,box-shadow] duration-150 ease-out"
```

The complete three call sites should retain their existing hit-area classes and values, with only the transition declaration appended:

```tsx
<TabsTrigger
  className="relative flex-1 after:absolute after:-inset-y-2 after:content-[''] transition-[color,background-color,box-shadow] duration-150 ease-out"
  value="light"
>
  ライト
</TabsTrigger>
<TabsTrigger
  className="relative flex-1 after:absolute after:-inset-y-2 after:content-[''] transition-[color,background-color,box-shadow] duration-150 ease-out"
  value="dark"
>
  ダーク
</TabsTrigger>
<TabsTrigger
  className="relative flex-1 after:absolute after:-inset-y-2 after:content-[''] transition-[color,background-color,box-shadow] duration-150 ease-out"
  value="system"
>
  システム
</TabsTrigger>
```

Do not change the tab dimensions, roving focus behavior, selected-state semantics, or the generated primitive.

## Repo conventions to follow

- `src/components/ui/*` is generated and must remain untouched.
- Consumer-specific visual overrides belong in the feature component, as already done by `ThemeSettings.tsx:70-80` for the 44px vertical hit area.
- Motion tokens are introduced by Plan 021; if that plan has landed, `ease-out` resolves to `cubic-bezier(0.23, 1, 0.32, 1)`. If Plan 021 has not landed, keep the class name as `ease-out` and do not inline a second curve.
- Recent transition cleanup in `src/components/habits/HabitFormServer.tsx:123,169,220,286` is the exemplar: enumerate visual properties instead of using `transition-all`.

## Steps

1. Update only the three `TabsTrigger` `className` strings in `src/components/settings/ThemeSettings.tsx` with `transition-[color,background-color,box-shadow] duration-150 ease-out`.
2. Confirm `cn`/`tailwind-merge` emits the explicit transition class without `transition-all`; do not edit `src/components/ui/tabs.tsx`.

## Boundaries

- Do NOT edit `src/components/ui/tabs.tsx` or any generated UI primitive.
- Do NOT change the tabs markup, labels, aria behavior, focus hit area, or theme persistence.
- Do NOT add transform or layout properties to the transition list.
- Do NOT add dependencies.

## Verification

- **Mechanical**: run `pnpm lint` and `pnpm test:types`. Expected result: both pass and `git diff -- src/components/ui/tabs.tsx` is empty.
- **Mechanical**: verify the merged class string for a rendered `TabsTrigger` contains `transition-[color,background-color,box-shadow]` and does not contain `transition-all`.
- **Feel check**: switch Light/Dark/System in Settings with keyboard and pointer; only the selected surface's color/background/shadow should settle over 150ms, with no width, padding, or positional tween.
- **Done when**: the ThemeSettings call sites explicitly transition only color/background/shadow, the generated primitive remains unchanged, and selected-state interaction is unaffected.
