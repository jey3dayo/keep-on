# 025 — dropdown の transform-origin を Tailwind v4 構文に直し、トリガー起点で開かせる

- **Status**: TODO
- **Commit**: c74f61c
- **Severity**: HIGH
- **Category**: Physicality & origin
- **Estimated scope**: 1 file, 2 箇所の文字列修正

## Problem

`src/components/ui/dropdown-menu.tsx` は Tailwind **v3** の bare CSS variable 省略記法
`origin-[--radix-dropdown-menu-content-transform-origin]` を使っている。このリポジトリは Tailwind **v4**
（`package.json` `tailwindcss: ^4.3.3`）で、v4 ではこの記法は `transform-origin: --radix-...` という
不正な宣言としてドロップされる。結果、dropdown の zoom-in はトリガー起点ではなく **中央から** 拡大する。

```tsx
// src/components/ui/dropdown-menu.tsx:48 — current（DropdownMenuSubContent、クラス文字列の一部）
'... z-50 min-w-[8rem] origin-[--radix-dropdown-menu-content-transform-origin] overflow-hidden ...'
```

```tsx
// src/components/ui/dropdown-menu.tsx:65 — current（DropdownMenuContent、クラス文字列の一部）
'... slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin] data-[state=closed]:animate-out ...'
```

ルール: 「Popovers/dropdowns/tooltips scale from their trigger, not center.」

## Target

v4 の CSS 変数括弧記法に置換する（値はまったく同じ Radix 変数）:

```text
origin-(--radix-dropdown-menu-content-transform-origin)
```

## Repo conventions to follow

- 同じ修正済みの手本が同階層にある: `src/components/ui/tooltip.tsx:49`
  `origin-(--radix-tooltip-content-transform-origin)` — この形式をそのまま踏襲する。
- `src/components/ui/` は biome の lint 除外だが、リポジトリにベンダリングされた編集可能ファイル。フォーマットは既存行に合わせる。

## Steps

1. `src/components/ui/dropdown-menu.tsx:48` の `origin-[--radix-dropdown-menu-content-transform-origin]` を `origin-(--radix-dropdown-menu-content-transform-origin)` に置換する。
2. 同ファイル `:65` の同一文字列を同様に置換する。

## Boundaries

- クラス文字列のこの 1 トークン以外を変更しない（並び順・他のクラスに触れない）。
- `tooltip.tsx` ほか他の ui コンポーネントには触れない。
- リポジトリ全体で `origin-[--` は上記 2 箇所のみ（確認済み）。他に見つけても本計画では触らず報告する。

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` が成功。`grep -rn 'origin-\[--' src/` が 0 件になる。
- **Feel check**: `pnpm dev` で dropdown を使う画面（習慣一覧の行メニュー等、`DropdownMenu` 使用箇所）を開き、
  - DevTools → Elements で開いた content 要素の computed `transform-origin` が `center`（50% 50%）以外（トリガー側の座標）になっている。
  - DevTools → Animations パネルで再生速度 10% にして開閉し、メニューがトリガーの角から生えるように拡大縮小することを目視確認。
- **Done when**: computed `transform-origin` がトリガー起点になり、grep が 0 件。
