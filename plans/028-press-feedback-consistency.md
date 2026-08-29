# 028 — 押下フィードバックの snap 解消と縮小率の統一（0.95）

- **Status**: TODO
- **Commit**: c74f61c
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 3 files

## Problem

`src/components/basics/Button.tsx:8` の cva base は `active:scale-95` を宣言するが、
`transition-transform` は `scale` variant（`:16-19`）の中にしかない。さらに Tailwind の
`transition-colors` と `transition-transform` は同じ `transition-property` を設定するため
twMerge で後勝ちになり、呼び出し側が `transition-colors` を渡すと transform の遷移が消える。
結果、以下のボタンは押下・解放が **transition なしの瞬間 snap** になる:

```tsx
// src/components/streak/HabitListCard.tsx:233（244 も同一）— current（チェックイン −/＋、最高頻度）
className="h-11 w-11 rounded-full border border-border/70 bg-background/95 p-0 text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 active:scale-90 disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100"
```

```tsx
// src/components/streak/DashboardViewToggle.tsx:61 — current（ビュー切替、高頻度）
'min-h-11 min-w-11 transition-colors duration-200'
```

```css
/* src/app/globals.css:475-477 — current（色スウォッチ。transition はあるが縮小が強すぎる） */
.color-swatch {
  @apply w-8 h-8 rounded-full transition-transform active:scale-90;
}
```

ルール: 「Press feedback: `transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out`.
Keep it subtle (0.95–0.98).」`scale-90` は規定バンド（0.95–0.98）外。

## Target

- 3 箇所とも縮小率を `active:scale-95`（base と同値）に統一。
- transition-property に `transform` を含め、160ms + 強い ease-out トークンで動かす。

```tsx
// target — HabitListCard.tsx:233 / :244（transition と scale の部分だけ変更）
className="h-11 w-11 rounded-full border border-border/70 bg-background/95 p-0 text-foreground shadow-sm transition-[color,background-color,transform] duration-160 ease-out hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 active:scale-95 disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100"
```

```tsx
// target — DashboardViewToggle.tsx:61
'min-h-11 min-w-11 transition-[color,background-color,transform] duration-160 ease-out'
```

```css
/* target — globals.css .color-swatch */
.color-swatch {
  @apply w-8 h-8 rounded-full transition-transform duration-160 ease-out active:scale-95;
}
```

## Repo conventions to follow

- 160ms + `ease-out`（トークン曲線）の手本: `src/components/basics/Button.tsx:94`
  `transition-[background-color,box-shadow,opacity,transform] duration-160 ease-out` と
  `src/components/streak/HabitCircleItem.tsx:134` `transition-transform duration-160 ease-out`。
- `duration-160` は既存の書き方（v4 の任意数値 duration）。`duration-150` に丸めない。
- reduced-motion: `motion-reduce:transition-none motion-reduce:active:scale-100` を既存どおり維持。`.color-swatch` の reduced-motion 打ち消しは `globals.css:594-597`（`.color-swatch:active { transform: none }`）が既に面倒を見ているので触らない。

## Steps

1. `src/components/streak/HabitListCard.tsx:233` と `:244` — `transition-colors` → `transition-[color,background-color,transform] duration-160 ease-out`、`active:scale-90` → `active:scale-95`。
2. `src/components/streak/DashboardViewToggle.tsx:61` — `'min-h-11 min-w-11 transition-colors duration-200'` → `'min-h-11 min-w-11 transition-[color,background-color,transform] duration-160 ease-out'`。
3. `src/app/globals.css` `.color-swatch` — `active:scale-90` → `active:scale-95`、`transition-transform` に `duration-160 ease-out` を追加。

## Boundaries

- `Button.tsx` の cva base・variant は変更しない（`scale` variant の hover 挙動は DESIGN.md 準拠で確定済み）。
- `MobileTabBar.tsx` と `SiteHeader.tsx` には transform フィードバックを **追加しない**（高頻度ナビは背景ハイライトのみが意図。頻度ルールにより motion は載せない）。
- 見た目の縮小率統一以外のスタイル（色・サイズ・ring）に触れない。
- 見つけたコードが Commit 時点とずれていたら STOP して報告する。

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit`、`pnpm exec biome check <touched files>` 成功。
- **Feel check**: `pnpm dev` で、
  - リストビューの −/＋ ボタンを押しっぱなし → 離す: 縮小と復帰が両方向とも滑らかに補間される（snap しない）。縮小量が控えめ（以前の 0.90 より浅い）。
  - ビュー切替トグルを押す: 同上。
  - 習慣フォームの色スウォッチを押す: 同上。
  - DevTools Rendering → prefers-reduced-motion で 3 箇所とも縮小が出ない。
- **Done when**: `grep -rn 'active:scale-90' src/` が 0 件で、上記 feel check が通る。
