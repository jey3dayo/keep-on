# 020 — 高頻度チェックインの hover 拡大を外し、press feedback を短くする

- **Status**: TODO
- **Commit**: 5577aeb
- **Severity**: HIGH
- **Category**: Purpose & frequency / Accessibility
- **Estimated scope**: 3 files, small UI-only diff

## Problem

KeepOn は日常のチェックインを最短操作にする crisp な習慣トラッカーであり、`DESIGN.md:330` は「ホバーの拡大はインタラクティブな強調面に限り、常用ナビや高頻度チェックインには載せない」と定めている。

現在は、リスト上の全チェックイン円が共有 `CheckInButton` の `scale="lg"` を受け、hover で 110% に拡大する。シンプルビューのチェックイン円も `scale="md"` で 105% に拡大する。チェックインは一日に何度も繰り返すため、視線を対象へ戻すための演出ではなく、毎回の操作に不要な移動を足している。

`src/components/basics/Button.tsx:7-18` — shared button variants:

```tsx
const buttonVariants = cva('focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95', {
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
  variants: {
    scale: {
      lg: 'transition-transform hover:scale-110',
      md: 'transition-transform hover:scale-105',
      none: '',
      sm: 'transition-transform hover:scale-102',
    },
```

`src/components/basics/Button.tsx:87-99` — list check-in button:

```tsx
export function CheckInButton({ children, completed = false, className, ...props }: CheckInButtonProps) {
  return (
    <Button
      className={cn(
        'h-14 w-14 flex-shrink-0 rounded-full transition-[background-color,box-shadow,opacity,transform] duration-300 hover:bg-transparent',
        completed && 'ring-2 ring-offset-2 ring-offset-background',
        className
      )}
      scale="lg"
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  )
}
```

`src/components/streak/HabitListCard.tsx:178-199` renders `CheckInButton` for every list habit, so the shared `scale="lg"` is not an isolated storybook variant.

`src/components/streak/HabitCircleItem.tsx:113-125` applies the medium hover scale to the primary check-in target in the immersive view:

```tsx
<Button
  aria-label={isCompleted ? `${habit.name}のチェックインを取り消す` : `${habit.name}をチェックイン`}
  className="relative h-[140px] w-[140px] p-0 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0 motion-reduce:active:scale-100"
  onClick={onCheckin}
  ...
  scale="md"
  type="button"
  variant="ghost"
>
```

The shared base also applies `active:scale-95` without a reduced-motion override (`src/components/basics/Button.tsx:7`). `src/components/streak/HabitSimpleView.tsx:241-246` has a second transform-only state change for page dots, but no `motion-reduce` override:

```tsx
className={cn(
  "relative h-2 w-2 rounded-full p-0 transition-[transform,background-color] duration-300 after:absolute after:-inset-[18px] after:content-[''] hover:bg-transparent",
  currentPage === page ? 'scale-125 bg-white' : 'bg-white/40 hover:bg-white/60'
)}
```

The global reduced-motion safety net shortens transition duration but intentionally does not remove every transform (`src/app/globals.css:465-489`), so these component transforms must opt out locally.

## Target

Keep the existing `scale` variants for deliberate CTA surfaces such as `AddHabitButton`, but make both check-in targets press-only. The press response must stay subtle and within the 100–160ms button-feedback budget from `AUDIT.md`; use the existing scale-down contract and do not add a hover transform.

`src/components/basics/Button.tsx` should expose the shared reduced-motion guard and leave CTA scale variants available:

```tsx
const buttonVariants = cva('focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 motion-reduce:active:scale-100', {
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
  variants: {
    scale: {
      lg: 'transition-transform hover:scale-110 motion-reduce:hover:scale-100',
      md: 'transition-transform hover:scale-105 motion-reduce:hover:scale-100',
      none: '',
      sm: 'transition-transform hover:scale-102 motion-reduce:hover:scale-100',
    },
    size: {
      default: 'h-10',
      icon: 'h-11 w-11',
      lg: 'h-11',
      sm: '',
    },
    variant: {
      default: '',
      destructive: '',
      ghost: '',
      link: '',
      outline: '',
      primary: '',
      secondary: '',
    },
  },
})
```

`CheckInButton` should opt out of the hover-scale variant and shorten its transform response to 160ms:

```tsx
<Button
  className={cn(
    'h-14 w-14 flex-shrink-0 rounded-full transition-[background-color,box-shadow,opacity,transform] duration-160 ease-out hover:bg-transparent motion-reduce:active:scale-100',
    completed && 'ring-2 ring-offset-2 ring-offset-background',
    className
  )}
  scale="none"
  size="icon"
  type="button"
  variant="ghost"
  {...props}
>
```

The main check-in target in `HabitCircleItem` should similarly use `scale="none"` and an explicit 160ms press transition. Keep its existing `motion-reduce:active:scale-100` guard. Do not remove the inner completed-state `scale-105`/glow; that is the intentional completion cue documented by `DESIGN.md:342-346`.

The page-dot class in `HabitSimpleView` should retain its color transition but add `motion-reduce:scale-100`; reduce the normal selection transition to `duration-200` so a page change does not linger. The reduced-motion state must keep the color change and remove only the decorative scale.

## Repo conventions to follow

- Shared button behavior belongs in `src/components/basics/Button.tsx`; do not edit `src/components/ui/button.tsx`.
- `DESIGN.md:330-332` is the product convention: small press scale, no hover enlargement on high-frequency check-ins, circular chrome for icon controls.
- Existing immersive completion feedback is the exemplar at `src/components/streak/HabitCircleItem.tsx:135-143`: a small completed-state scale and glow, separate from pointer hover.
- Existing component-level reduced-motion guards use `motion-reduce:active:scale-100`, for example `src/components/streak/HabitListCard.tsx:233-244`.

## Steps

1. In `src/components/basics/Button.tsx`, add `motion-reduce:active:scale-100` to the base variant and `motion-reduce:hover:scale-100` to the three named hover-scale variants. Keep `AddHabitButton` and its `scale="md"` unchanged.
2. In `src/components/basics/Button.tsx`, change `CheckInButton` from `scale="lg"` to `scale="none"`, retain the circular dimensions and completion ring, and set its transform-inclusive transition to `duration-160 ease-out` with `motion-reduce:active:scale-100`.
3. In `src/components/streak/HabitCircleItem.tsx`, remove the `scale="md"` prop from the main check-in button, use `scale="none"`, and add `transition-transform duration-160 ease-out` while preserving the existing focus and reduced-motion classes.
4. In `src/components/streak/HabitSimpleView.tsx`, change only the page-dot selection transition to `duration-200` and add `motion-reduce:scale-100`. Do not change page slicing, touch hit areas, or pagination behavior.
5. Add or update focused assertions only if needed to protect the shared class contract: a `CheckInButton` render must not contain `hover:scale-110`, must contain `motion-reduce:active:scale-100`, and the Add Habit CTA must retain its hover scale.

## Boundaries

- Do NOT edit `src/components/ui/*`; those are generated shadcn/ui primitives.
- Do NOT remove the `scale` API or the `AddHabitButton` hover emphasis.
- Do NOT change completion glow/scale, progress-ring timing, long-press fill, navigation, markup structure, or optimistic check-in behavior.
- Do NOT replace color/opacity feedback with a fully static control; reduced motion should remove decorative transform while keeping state comprehension.
- Do NOT add dependencies.
- If the `Button` class merge does not produce the target classes shown above, stop and report instead of weakening the shared button contract.

## Verification

- **Mechanical**: run `pnpm lint`, `pnpm test:types`, and `pnpm test:run -- src/components/basics/Button.test.tsx`. Expected result: all commands pass; no `src/components/ui/*` file changes.
- **Feel check**: on a desktop pointer, move over a list check-in circle and the simple-view check-in circle; neither should grow on hover. Pressing either should compress to approximately 95% and settle within 160ms. The Add Habit CTA should still retain its deliberate hover emphasis.
- **Feel check**: in DevTools, enable `prefers-reduced-motion: reduce`; pressing any button and changing page dots must not scale, while the page-dot color and check-in completion state still update.
- **Feel check**: set animation playback to 10% and confirm the inner completed circle still performs only the documented completion cue, not a second hover animation.
- **Done when**: high-frequency check-in controls have no hover scale, their press feedback is at most 160ms, generic buttons and page dots honor reduced motion, and CTA/completion affordances remain intact.
