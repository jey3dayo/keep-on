# Plan 032: SW のビルド識別をページ依存の登録 URL からファイル内スタンプへ移す

> **Executor instructions**: この plan を順に実施し、検証をすべて実行する。STOP 条件に当たったら停止して報告する。
>
> **Drift check**: `git diff --stat be9d915..HEAD -- public/sw.js src/components/pwa/ServiceWorkerRegistration.tsx next.config.ts package.json scripts/`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED（デプロイパイプラインと SW 更新経路の両方を触る）
- **Depends on**: `plans/031`（この plan は 031 の実装方式を差し替える）
- **Category**: correctness（本番で発生中の回帰）
- **Planned at**: commit `be9d915`, 2026-09-01

## Why this matters

`plans/031`（`f6f3b6b`、本番デプロイ済み）で SW の登録 URL を `/sw.js?v=${NEXT_PUBLIC_SW_VERSION}` にした。
`NEXT_PUBLIC_SW_VERSION` は**その登録処理を実行しているページの JS バンドルのビルド ID**である。
つまり **SW の登録 URL が「登録しに来たページのビルド」に依存する**。これが誤りである。

ナビゲーションが stale-while-revalidate（`public/sw.js:211-` 、`c12c887`）なので、古いビルドのページが
動く状況は通常運転で起きる。そのとき次の ping-pong が成立する。

1. 稼働中の SW は `?v=NEW` で登録済み（`CACHE_NAME = keepon-NEW`）
2. 旧ビルドのページが `register('/sw.js?v=OLD')` を呼ぶ → **URL が違うため別スクリプト扱い** → install → waiting → 更新トーストが出る
3. 「更新する」を押すと `?v=OLD` の worker が activate し、その `CACHE_NAME` は `keepon-OLD` になる
4. `activate` の掃除（`public/sw.js:183-188`）が `keepon-NEW` を削除する
5. reload 後は HTML がネットワークから来て新ビルドになり、`register('/sw.js?v=NEW')` → また URL が違う → install → waiting → **トーストが再出現**

ユーザー報告は「バージョンアップ通知が更新しても消えない」。この経路と症状が一致する。
さらに 4 で毎回キャッシュを捨てるため、031 が保とうとした SWR の即応性そのものが失われる。

**注記**: 本番ブラウザでの直接確認はまだ行えていない（Chrome プロファイルの都合で Access セッションが
無かった）。ただし「登録 URL がページのビルドに依存する」構造の誤り自体はコード上で確定しており、
本 plan の修正内容は確認結果に依存しない。確認が取れたら本 plan の Why にログを追記する。

## 方針

**SW のビルド識別を「登録 URL のクエリ」から「SW ファイル自身に埋め込むスタンプ」へ移す。**

- 登録は `register('/sw.js')`（クエリなし・安定 URL）に戻す。ページのビルドに依存しなくなる
- `public/sw.js` にプレースホルダを置き、**ビルド成果物 `.open-next/assets/sw.js` を後処理で置換**する
- SW ファイルの内容が毎デプロイ変わるため、ブラウザのバイト比較による更新検知は安定 URL のままでも働く。
  031 が URL 変更で担っていた「更新契機」はこれで置き換わる
- 同一デプロイの全クライアントが**同一の `CACHE_NAME`** を見る（031 ではページごとにズレえた）

`scripts/patch-open-next.mjs` は既に存在せず `build:cf` からも外れているため、前例の流用ではなく
新しい後処理スクリプトを1本追加する。

## Current state

```js
// public/sw.js:5-6（031 で入った。ページ依存の原因）
const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const CACHE_NAME = `keepon-${SW_VERSION}`
```

```tsx
// src/components/pwa/ServiceWorkerRegistration.tsx:60-61
// 登録URLをビルドごとに変えて、デプロイ時のSW更新を検知させる
.register(`/sw.js?v=${process.env.NEXT_PUBLIC_SW_VERSION}`)
```

```ts
// next.config.ts: resolveSwVersion() と env.NEXT_PUBLIC_SW_VERSION（031 で追加）
```

```json
// package.json
"build:cf": "CF_BUILD=1 dotenvx run --overload -- opennextjs-cloudflare build"
```

ビルド成果物の SW は `.open-next/assets/sw.js` に置かれる（実測）。`pnpm dev` では SW を明示 unregister
するため（`ServiceWorkerRegistration.tsx:44-57`）、dev で置換が走らなくても実害はない。

## Scope

**In scope**:

- `public/sw.js` — バージョン導出をプレースホルダ方式へ。**それ以外のロジックは変更しない**
- `scripts/stamp-sw-version.mjs`（新規）— `.open-next/assets/sw.js` のプレースホルダを置換
- `package.json` — `build:cf` に後処理を連結（**依存は一切変更しない**）
- `src/components/pwa/ServiceWorkerRegistration.tsx` — 登録を `/sw.js` へ戻す。加えて後述の更新経路の穴を塞ぐ
- `next.config.ts` — `NEXT_PUBLIC_SW_VERSION` と `resolveSwVersion()` を削除（不要になる）

**Out of scope**:

- SWR の主経路（`if (cached) return cached`）の変更
- `skipWaiting` の自動化（`JEY-637`）
- `plans/015` で入れた purge 経路の変更

## Steps

### Step 1: `public/sw.js` をプレースホルダ方式にする

```js
// ビルド後処理（scripts/stamp-sw-version.mjs）が __SW_BUILD_ID__ を実ビルド ID へ置換する。
// 置換されない場合（ローカルの public/ 直参照・dev）は 'dev' として動く。
// 登録 URL にクエリを付けてはならない: 登録しに来たページのビルドに CACHE_NAME が依存し、
// 旧ビルドのページと新ビルドのページで別 SW が入れ替わり続ける（plan 032 の Why 参照）。
const SW_BUILD_ID = '__SW_BUILD_ID__'
const CACHE_NAME = `keepon-${SW_BUILD_ID.startsWith('__') ? 'dev' : SW_BUILD_ID}`
```

プレースホルダ判定は `startsWith('__')` で行う（置換されなかったリテラルをそのままキャッシュ名にしない）。
`activate` の掃除ロジック（`:183-188`）は**変更しない**。これが旧ビルドのキャッシュ回収経路である。

### Step 2: 後処理スクリプトを作る

`scripts/stamp-sw-version.mjs` を新規作成する。

- 対象は `.open-next/assets/sw.js` のみ。存在しなければ**エラーで終了する**（デプロイ前に気づけるようにする）
- ビルド ID は `process.env.GITHUB_SHA` の先頭12文字 → 無ければ `git rev-parse --short=12 HEAD` → それも失敗なら `dev`
- ファイル内の `__SW_BUILD_ID__` を**1件以上置換できたことを検証**し、0件なら **エラーで終了する**（fail-closed）
- 置換後のファイルに `__SW_BUILD_ID__` が残っていないことを確認する
- 実行結果（使用したビルド ID と置換件数）を標準出力に出す

`node:fs` と `node:child_process` を使う。ビルド時のみ実行されるため Edge Runtime 制約には触れない。

### Step 3: `build:cf` に連結する

```json
"build:cf": "CF_BUILD=1 dotenvx run --overload -- opennextjs-cloudflare build && node scripts/stamp-sw-version.mjs"
```

`&&` で連結し、置換失敗時はビルド全体を失敗させる。`.github/workflows/deploy.yml` は `pnpm build:cf` を
呼ぶだけなので workflow 側の変更は不要。

### Step 4: 登録を安定 URL へ戻し、更新経路の穴を塞ぐ

`src/components/pwa/ServiceWorkerRegistration.tsx`:

1. `.register('/sw.js')` に戻す。031 で足したコメントは Step 1 の理由に置き換える
2. **`handleUpdate` の穴を塞ぐ**。現状は `registration?.waiting` が無いと postMessage もリロードもせず、
   `updateAvailable` も false に戻らないため、押しても何も起きずトーストが残り続ける（`:88-98`）。
   `waiting` が無い場合は `setUpdateAvailable(false)` でトーストを畳む
3. `controllerchange` のリスナ登録を `handleUpdate` の中で毎回行っている。クリックのたびに増えるため、
   `{ once: true }` を付ける

`next.config.ts` から `resolveSwVersion()` と `env.NEXT_PUBLIC_SW_VERSION` を削除する
（`node:child_process` の import も不要になる）。

### Step 5: 既存キャッシュからの移行を確認する

現在本番には `keepon-<sha>` 形式のキャッシュが存在しうる（031 由来）。本 plan 適用後は
`keepon-<stamped sha>` になり、`activate` の掃除で旧名は削除される。名前形式が同じなので特別な移行処理は不要。
`keepon-dev` が本番に残る経路が無いことを確認する（Step 2 の fail-closed により、置換漏れのまま
デプロイされない）。

## Verify

| 目的 | コマンド | 期待 |
| --- | --- | --- |
| Lint | `node_modules/.bin/biome check --write next.config.ts src/components/pwa/ServiceWorkerRegistration.tsx scripts/stamp-sw-version.mjs public/sw.js` | exit 0 |
| 型 | `node_modules/.bin/tsc --noEmit` | exit 0 |
| SW 関連の既存テスト | `node_modules/.bin/vitest run src/hooks/useSwRevalidation.test.ts src/hooks/useOfflineCheckin.test.ts src/lib/pwa` | all pass |
| 空白混入 | `git diff --check` | exit 0 |

orchestrator が目視・実測で確認する（worker は実施しなくてよい）。

- `pnpm build:cf` を通し、`.open-next/assets/sw.js` に `__SW_BUILD_ID__` が残っていないこと
- 同ファイルの `SW_BUILD_ID` が実 SHA になっていること
- ビルド成果物に `sw.js?v=` が**現れないこと**（登録 URL からクエリが消えたことの証明）
- `activate` の掃除ロジックが無変更であること
- full gate は `lefthook run pre-push`

## STOP conditions

- `.open-next/assets/sw.js` 以外にも置換が必要な出力先が見つかった場合
- 置換対象が見つからず fail-closed が成立しない場合
- SWR の主経路や `activate` の掃除ロジックの変更が必要になった場合
- 依存3ファイル（`package.json` の `dependencies` / `pnpm-lock.yaml` / `pnpm-workspace.yaml`）の変更が必要になった場合
  （`scripts` セクションへの後処理連結は Step 3 として許可される）

## 関連

- `plans/031-sw-build-scoped-cache.md` — 本 plan が実装方式を差し替える。031 の目的（デプロイ跨ぎの
  アセット不整合の解消）は維持し、手段だけを URL クエリからファイルスタンプへ移す
- `JEY-636` — 031 が解いた元の不具合
- `JEY-637` — `skipWaiting` 自動化（残余の窓）。本 plan では扱わない
