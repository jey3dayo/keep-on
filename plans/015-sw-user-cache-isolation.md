# Plan 015: sign-out / ユーザー交代時のユーザー HTML purge を controller 不在でも成立させる

> **Executor instructions**: この plan を順に実施し、検証をすべて実行する。STOP 条件に当たったら停止して報告する。
>
> **Drift check**: `git diff --stat f6f3b6b..HEAD -- public/sw.js src/lib/auth/sign-out.ts src/components/pwa/ServiceWorkerRegistration.tsx src/constants/pwa.ts src/lib/pwa/`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/031`（SW キャッシュのビルドスコープ化・DONE `f6f3b6b`）
- **Category**: security
- **Planned at**: commit `0f714c1`, 2026-08-14
- **Rewritten at**: commit `403e653`, 2026-09-01（SWR 化 `c12c887` と plan 031 `f6f3b6b` で前提が変わったため全面改稿）

## 改稿の理由（旧版との差分）

旧版は network-first 時代の計画で、次の2点がもう成立しない。

1. **旧 Step 2「ネットワーク失敗時に `cached` を返すな」は前提が反転した。** `c12c887` の SWR 化により、
   ナビゲーションは失敗時のフォールバックではなく**主経路として、ネットワークを見る前にキャッシュを返す**
   （`public/sw.js:218-224`）。旧 Step 2 をそのまま適用すると SWR 化そのものの否定になる。
2. **旧 Step 1・2 の `SW_CACHE_NAME = 'keepon-v5'` / `keepon-v6` へ bump は実装不能。** plan 031 で
   `CACHE_NAME` は SW 自身の URL クエリから実行時に導出する形（`keepon-${SW_VERSION}`）になり、
   固定文字列リテラルは存在しない。

**キャッシュ優先（SWR）は設計意図として維持する**という判断（2026-09-01）に基づき、本 plan の範囲を
「SWR は変えず、purge の穴を塞ぐ」に絞る。

## Why this matters

`src/lib/auth/sign-out.ts` の purge は `navigator.serviceWorker?.controller?.postMessage(...)` だけで、
**controller が無ければ何も消えない**。controller が無い状況は実際に起きる。

- SW が installed だが未 activate（初回訪問直後、あるいは更新が waiting のまま）
- `Clients.claim()` 前
- ユーザーがハードリロード（`shift`+reload）した直後のページ

このとき `/dashboard` `/habits` `/analytics` のユーザー固有 HTML（習慣名・進捗）がキャッシュに残り、
共有端末で次のユーザーがそのルートへ入ると SWR の主経路で**前ユーザーの HTML が即座に返る**。
`ServiceWorkerRegistration.tsx:25,36` のユーザー交代検知も同じ `controller?.postMessage` 依存で同じ穴を持つ。

## 受け入れる残存リスク（この plan では閉じない）

SWR の構造上、**controller があって purge が走る場合でも、purge 前の一瞬は前ユーザーの HTML が返りうる**。
これを完全に消すには次のいずれかが必要で、本 plan の範囲外とする。

- 個人化 HTML を network-first へ戻す → `c12c887` の目的を放棄する
- キャッシュをユーザー別に名前空間化（`keepon-${SW_VERSION}-${userIdHash}` 等）→ 規模が大きく、
  共有端末が実際に想定用途に入ると確認できてから投資すべき

本 plan は「purge が走らない穴を塞ぐ」修正であり、「SWR の露出窓を消す」修正ではない。
`public/sw.js` の cached 分岐コメントにある許容契約はそのまま維持する。

## Current state

```js
// public/sw.js:218-224（SWR の主経路。変更しない）
if (cached) {
  broadcastToClients({ path: url.pathname, type: 'NAV_STALE_SERVED' }).catch(() => undefined)
  return { response: cached, revalidate: () => revalidateNavigation(request, cache, url.pathname) }
}
```

```ts
// src/lib/auth/sign-out.ts
function requestUserCacheClear(): void {
  if (typeof navigator !== 'undefined') {
    navigator.serviceWorker?.controller?.postMessage({ type: SW_MSG_CLEAR_USER_CACHE })
  }
}
```

```tsx
// src/components/pwa/ServiceWorkerRegistration.tsx:25, :36（ユーザー交代 / サインアウト検知）
navigator.serviceWorker?.controller?.postMessage({ type: SW_MSG_CLEAR_USER_CACHE })
```

`src/lib/pwa/` には `offline-queue.ts` のみ。`src/constants/pwa.ts` にキャッシュ名・ルート定数は無い
（メッセージタイプのみ）。

## 方針

SW への `postMessage` は残したまま、**Cache API による client 側 fallback purge を併走させる**。
キャッシュ名は plan 031 でビルド連動になったため固定名で開けない。したがって
**`caches.keys()` を `keepon-` プレフィックスで走査する**。

`NEXT_PUBLIC_SW_VERSION` から名前を計算する案は採らない。旧 SW が waiting で生きている窓では
client のビルド（新）と稼働中 SW のキャッシュ（旧）がズレ、消し漏れるため。

## Scope

**In scope**:

- `src/constants/pwa.ts` — `SW_CACHE_NAME_PREFIX` と `SW_USER_CACHEABLE_ROUTE_PREFIXES` を追加（`sw.js` と同期する旨をコメント）
- `src/lib/pwa/clear-user-caches.ts`（新規）— `isUserCacheablePathname` と `clearUserCachesBestEffort`
- `src/lib/pwa/__tests__/clear-user-caches.test.ts`（新規）
- `src/lib/auth/sign-out.ts` — fallback purge を併走
- `src/components/pwa/ServiceWorkerRegistration.tsx` — 2箇所の生 `postMessage` を同ヘルパーへ寄せる
- `public/sw.js` — 定数の同期先を指すコメント1行のみ（**ロジックは変更しない**）

**Out of scope**:

- SWR の主経路（`if (cached) return cached`）の変更
- ユーザー別キャッシュ名前空間の導入
- `skipWaiting` の自動化（`plans/031` の「既知の限界」）
- Background Sync replay ループ、IndexedDB の client 直接クリア

## Steps

### Step 1: 定数を追加する

`src/constants/pwa.ts` に追記する。既存のコメント様式（「sw.js と同期すること」）に合わせる。

```ts
/** SW キャッシュ名のプレフィックス（sw.js の CACHE_NAME はビルド連動のため前方一致で扱う） */
export const SW_CACHE_NAME_PREFIX = 'keepon-' as const

/** ユーザー固有 HTML をキャッシュするルート（sw.js の CACHEABLE_ROUTES と同期すること） */
export const SW_USER_CACHEABLE_ROUTE_PREFIXES = ['/dashboard', '/habits', '/analytics'] as const
```

`public/sw.js` の `CACHEABLE_ROUTES` 宣言箇所に、同期先が `src/constants/pwa.ts` であるコメントを1行足す。
**`sw.js` のロジックは触らない。**

### Step 2: purge ヘルパーを作る

`src/lib/pwa/clear-user-caches.ts` を新規作成する。

- `isUserCacheablePathname(pathname: string): boolean` — `SW_USER_CACHEABLE_ROUTE_PREFIXES` の前方一致。純関数として export する（テスト対象）
- `clearUserCachesBestEffort(): Promise<void>` — 次を行う
  1. `navigator.serviceWorker?.controller?.postMessage({ type: SW_MSG_CLEAR_USER_CACHE })`（従来経路を維持）
  2. `'caches' in globalThis` を確認してから `caches.keys()` を取得し、`SW_CACHE_NAME_PREFIX` で始まる名前だけを開く
  3. 各キャッシュの `cache.keys()` から、`new URL(req.url).pathname` が `isUserCacheablePathname` を満たすものを `cache.delete(req)`
  4. 全体を try/catch で包み、失敗してもログアウト遷移を妨げない（best-effort）

`any` 型・型アサーションは使わない。`caches` が無い環境（SSR・古いブラウザ）で例外を投げないこと。

### Step 3: 呼び出し側を寄せる

- `src/lib/auth/sign-out.ts` — `requestUserCacheClear()` を `clearUserCachesBestEffort()` に置き換える。
  `window.location.assign` の前に**呼び出しを開始する**（await はしない。fire-and-forget で可）
- `src/components/pwa/ServiceWorkerRegistration.tsx:25,36` — 生 `postMessage` を同ヘルパー呼び出しへ置き換える。
  不要になった `SW_MSG_CLEAR_USER_CACHE` の import は外す（ヘルパー内へ移る）

ユーザー交代・サインアウトの検知ロジック自体は変更しない。

### Step 4: テストを書く

`src/lib/pwa/__tests__/clear-user-caches.test.ts` を新規作成する。

`isUserCacheablePathname` の純関数テスト:

- true: `/dashboard`、`/habits`、`/habits/h4`、`/analytics`
- false: `/offline`、`/api/me`、`/settings`、`/`

`clearUserCachesBestEffort` のテスト（`caches` と `navigator.serviceWorker` をモック）:

- `keepon-` で始まるキャッシュのユーザールートのエントリだけが削除される
- `keepon-` で始まらないキャッシュは開かれない
- `controller` が `undefined` でも Cache API の削除は実行される（**この plan の主目的**）
- `caches` が存在しない環境で例外を投げない

## Verify

| 目的 | コマンド | 期待 |
| --- | --- | --- |
| Lint | `node_modules/.bin/biome check --write src/constants/pwa.ts src/lib/pwa/clear-user-caches.ts src/lib/pwa/__tests__/clear-user-caches.test.ts src/lib/auth/sign-out.ts src/components/pwa/ServiceWorkerRegistration.tsx` | exit 0 |
| 型 | `node_modules/.bin/tsc --noEmit` | exit 0 |
| テストの型 | `node_modules/.bin/tsc --project tsconfig.test.json --noEmit` | exit 0 |
| 新規テスト | `node_modules/.bin/vitest run src/lib/pwa` | all pass |
| 既存 SW 関連 | `node_modules/.bin/vitest run src/hooks/useSwRevalidation.test.ts src/hooks/useOfflineCheckin.test.ts` | all pass |
| 空白混入 | `git diff --check` | exit 0 |

orchestrator が目視で確認する。

- `public/sw.js` の差分がコメント1行のみで、ロジックが変わっていないこと
- `SW_USER_CACHEABLE_ROUTE_PREFIXES` が `sw.js` の `CACHEABLE_ROUTES` と同じ3ルートであること
- full gate は `lefthook run pre-push`（`tsc --noEmit` 単独では stories の型エラーを見逃す）

## STOP conditions

- SWR の主経路（`if (cached) return cached`）を変えないと成立しない設計になった場合
- `sw.js` のロジック変更が必要になった場合
- 依存3ファイル（`package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml`）の変更が必要になった場合
- `caches` のモックが既存のテスト基盤で組めず、新規依存の追加が必要になった場合

## Maintenance notes

- ユーザー固有 HTML をキャッシュするルートを増やすときは、`public/sw.js` の `CACHEABLE_ROUTES` と
  `src/constants/pwa.ts` の `SW_USER_CACHEABLE_ROUTE_PREFIXES` の**両方**を更新する
- キャッシュ名のプレフィックスを変えるときは、plan 031 の `CACHE_NAME` 導出と
  `SW_CACHE_NAME_PREFIX` を揃える

## 関連

- `plans/031-sw-build-scoped-cache.md` — `CACHE_NAME` をビルド連動にした変更。本 plan が固定名でなく
  プレフィックス走査を採る理由
