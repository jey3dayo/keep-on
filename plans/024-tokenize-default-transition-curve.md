# 024 — Tailwind のデフォルト transition 曲線をリポジトリのトークンに揃える

- **Status**: TODO
- **Commit**: c74f61c
- **Severity**: HIGH
- **Category**: Easing & duration / Cohesion & tokens
- **Estimated scope**: 1 file, 1 行追加（効果は約 30 箇所に波及）

## Problem

`src/app/globals.css` の `@theme inline` は `--ease-out` / `--ease-in-out` / `--ease-drawer` を定義しているが、
**`--default-transition-timing-function` を上書きしていない**。そのため `ease-*` クラスを明示しない
`transition-*` ユーティリティはすべて Tailwind 組み込みの弱い曲線
`cubic-bezier(0.4, 0, 0.2, 1)` で動く。トークン化された 3 曲線と競合する「4 本目の未管理カーブ」が、
アプリで最も頻繁に触られる面に載っている:

- `src/components/streak/HabitListCard.tsx:147` `transition-[border-color,box-shadow,opacity] duration-200`（習慣カード hover）
- `src/components/streak/HabitListCard.tsx:233` / `:244` `transition-colors …`（チェックイン ± ボタン、最高頻度）
- `src/components/dashboard/MobileTabBar.tsx:23` `transition-colors active:bg-accent/50`（タブバー）
- `src/components/streak/HabitCircleItem.tsx:150` `transition-opacity duration-300`、`:186` `transition-colors duration-300`
- `src/components/streak/DashboardViewToggle.tsx:61` `transition-colors duration-200`
- ほか `HabitFormServer.tsx` / `HabitTableClient.tsx` / `SiteHeader.tsx` / `app/page.tsx` 等、約 30 箇所

```css
/* src/app/globals.css:92-94 — current（@theme inline 内。default の上書きが無い） */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

## Target

`@theme inline` に 1 行追加し、`ease-*` 未指定の全 `transition-*` を強い ease-out に載せる。

```css
/* target — globals.css の --ease-drawer 定義の直後に追加 */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
/* ease-* 未指定の transition ユーティリティも --ease-out と同じ曲線に載せる。
   Tailwind 組み込みの cubic-bezier(0.4,0,0.2,1) をトークン外の4本目の曲線にしない。 */
--default-transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
```

値は `--ease-out` と同一のリテラルで書く（`@theme inline` 内での `var()` 参照に頼らない）。

## Repo conventions to follow

- 曲線トークンは `src/app/globals.css` の `@theme inline`（53 行目開始）に置く。
- 既存の消費例: `globals.css:147` `animation: keep-on-motion-enter 200ms var(--ease-out) both;`
- コメントは Why を日本語で書く（同ファイルの既存コメントに合わせる）。

## Steps

1. `src/app/globals.css` の `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);`（94 行目付近）の直後に、上記 Target の `--default-transition-timing-function` 行とコメントを追加する。

## Boundaries

- 他のファイルは一切触らない。各コンポーネントの `ease-out` 明示追加や duration 変更はしない。
- `--default-transition-duration`（既定 150ms）は変更しない。
- 見つけたコードが Commit 時点とずれていたら、改変せず STOP して報告する。

## Verification

- **Mechanical**: `pnpm exec biome check src/app/globals.css` がエラーなし。`pnpm build` が成功し、生成 CSS（`.next/` 内の CSS）を grep して `--default-transition-timing-function:cubic-bezier(.23,1,.32,1)`（minify 表記ゆれ許容）が出力されること。
- **Feel check**: `pnpm dev` でダッシュボードを開き、
  - 習慣リストカードの hover（border/shadow）と ± ボタンの hover が、以前よりわずかに「立ち上がりが速く、終わりが柔らかい」感触になる。
  - DevTools → Elements で ± ボタンの computed `transition-timing-function` が `cubic-bezier(0.23, 1, 0.32, 1)` になっている。
  - `ease-out` / `ease-[var(--ease-out)]` を明示している既存箇所（`HabitCircleItem.tsx:134` 等）の見た目が変わっていない（同一曲線のため）。
- **Done when**: computed style の確認 2 点が通り、ビルドが成功している。
