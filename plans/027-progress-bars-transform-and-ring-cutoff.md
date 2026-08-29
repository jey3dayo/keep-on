# 027 — 進捗バーを transform 化し、進捗リングが自分の fade に切断されないようにする

- **Status**: TODO
- **Commit**: c74f61c
- **Severity**: MEDIUM
- **Category**: Performance / Purpose & frequency
- **Estimated scope**: 4 files

## Problem

### A. リングのアニメーションが完走前に消される

`frequency === 1` の習慣（最多ケース）では 1 タップで progress=100% と `isCompleted` が同時に立つ。
リングの stroke は 500ms かけて満ちるが、その **ラッパーが 300ms で opacity-0** になるため、
チェックインのたびに fill が途中で消える。500ms は「捨てられるために存在する」duration になっている。

```tsx
// src/components/streak/ProgressRing.tsx:22 — current
className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
```

```tsx
// src/components/streak/HabitCircleItem.tsx:150-151 — current（リングのラッパー）
'absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none',
isCompleted && 'opacity-0'
```

`DESIGN.md`（Check-in & streak 節）は「変化は 300–500ms の ease-out」と幅で規定しており、
300ms への統一は設計意図の範囲内。

### B. 進捗バーが `width` を transition している（layout プロパティ）

```tsx
// src/components/streak/HabitListCard.tsx:217-223 — current（リストの習慣ごとに 1 本）
<div
  className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
  style={{
    backgroundColor: colorData.color,
    width: `${progressPercent}%`,
  }}
/>
```

```tsx
// src/app/(dashboard)/analytics/page.tsx:287 — current
className={`h-full ${periodStyles[entry.period].bar} transition-[width] duration-500 motion-reduce:transition-none`}
style={{ width: `${entry.rate}%` }}
```

```tsx
// src/app/(dashboard)/analytics/page.tsx:339 — current
className="h-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
style={{ width: `${progress}%` }}
```

ルール: 「Animate `transform` and `opacity` only.」`width` は layout+paint+composite を毎フレーム走らせる。
同じ analytics ページの `:226-227` には transform でやる正しい手本が既にある。
analytics の 500ms は UI 予算 300ms も超過。

### C. `ui/progress.tsx` の `transition-all`

```tsx
// src/components/ui/progress.tsx:20-21 — current
className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
```

動かしたいのは `transform` だけ。`transition: all` は常に finding。

## Target

- **A**: `ProgressRing.tsx:22` の `duration-500` → `duration-300`（ラッパーの fade と同じ長さにし、切断を解消）。
- **B**: 3 箇所とも `ui/progress.tsx` と同じ **translateX + overflow-hidden クリップ** 方式へ:

```tsx
// target — HabitListCard.tsx（外側の overflow-hidden rounded-full コンテナは既存のまま）
<div
  className="h-full w-full rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none"
  style={{
    backgroundColor: colorData.color,
    transform: `translateX(-${100 - progressPercent}%)`,
  }}
/>
```

```tsx
// target — analytics/page.tsx:287
className={`h-full w-full ${periodStyles[entry.period].bar} rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none`}
style={{ transform: `translateX(-${100 - entry.rate}%)` }}
```

```tsx
// target — analytics/page.tsx:339
className="h-full w-full rounded-full bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none"
style={{ transform: `translateX(-${100 - progress}%)` }}
```

- **C**: `progress.tsx:20` の `transition-all` → `transition-transform`。

## Repo conventions to follow

- translateX クリップ方式の手本: `src/components/ui/progress.tsx:20-21`（Radix Progress Indicator）。
- transform 方式の手本（scaleY 版）: `src/app/(dashboard)/analytics/page.tsx:226-227`。
- `ease-out` クラスは `globals.css` の `@theme` により強いトークン曲線 `cubic-bezier(0.23,1,0.32,1)` に解決される。明示して付ける。
- `motion-reduce:transition-none` は既存のまま残す。

## Steps

1. `src/components/streak/ProgressRing.tsx:22` — `duration-500` を `duration-300` に変更。
2. `src/components/streak/HabitListCard.tsx:217-223` — Target B の形へ（`w-full` 追加、`transition-[width]` → `transition-transform`、`width` style → `transform`）。外側 `:216` の `overflow-hidden rounded-full` コンテナは変更しない。
3. `src/app/(dashboard)/analytics/page.tsx:287` と `:339` — Target B の形へ。外側の `overflow-hidden` コンテナ（`:285`, `:337` 付近）が `overflow-hidden` を持つことを確認（無ければ追加）。
4. `src/components/ui/progress.tsx:20` — `transition-all` → `transition-transform`。

## Boundaries

- `HabitCircleItem.tsx` のラッパー fade（300ms）は変更しない。
- `analytics/page.tsx:226-227` の scaleY バーは正しいので触らない。
- バーの色・高さ・角丸・レイアウトを変えない（motion プロパティと style の書き方のみ）。
- 見つけたコードが Commit 時点とずれていたら STOP して報告する。

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit`、`pnpm exec biome check <touched files>` 成功。
- **Feel check**: `pnpm dev` で、
  - リストビューで frequency>1 の習慣に ＋ を押す: バーが以前と同様に右へ滑らかに伸びる。0% と 100% で見た目（角丸の潰れ・はみ出し）が旧実装と同一。
  - シンプルビューで frequency=1 の習慣をチェックイン: リングの fill が **消え始める前に満了して見える**（DevTools Animations パネル 10% 速度で、stroke-dashoffset の transition が opacity fade と同時に終わることを確認）。
  - analytics ページ初回描画: 達成率バーが 300ms で伸び、DevTools Performance で Layout が毎フレーム発生しない（transform のみ）。
  - reduced-motion（Rendering パネル）でバー・リングとも即座に最終状態になる。
- **Done when**: 上記 4 点が成立し、`grep -rn 'transition-\[width\]' src/` が 0 件。
