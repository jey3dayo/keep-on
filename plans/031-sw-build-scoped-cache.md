# Plan 031: SW キャッシュをビルド単位にスコープし、デプロイ跨ぎのアセット不整合を解消する

> **Executor instructions**: この plan を順に実施し、検証をすべて実行する。STOP 条件に当たったら停止して報告する。
>
> **Drift check**: `git diff --stat 23de1b4..HEAD -- public/sw.js src/components/pwa/ServiceWorkerRegistration.tsx next.config.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED（キャッシュ戦略の永続挙動を変える）
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `23de1b4`, 2026-09-01
- **Tracks**: Linear JEY-636

## Why this matters

`CACHE_NAME = 'keepon-v5'` はビルドに紐づかない固定値で、`activate` は名前の違うキャッシュしか削除しない
（`public/sw.js:3`, `:180-185`）。そのためデプロイをまたいで同一キャッシュが生き続け、次の食い違いが起きる。

1. `/dashboard` `/habits` `/analytics` のナビゲーションは stale-while-revalidate で**旧ビルドの HTML を即返す**（`:211-` 、`c12c887`）
2. その HTML が参照する CSS は `/_next/static/css/` のみ cache-first（`:194-195` → `:253-`）。キャッシュに無ければ origin へ出る
3. OpenNext + Cloudflare Workers の static assets はデプロイで差し替わり、**旧ハッシュの CSS は origin から消える**（Pages と異なり旧バージョンを保持しない）
4. 結果 `Response.error()` となり、**スタイル未適用のまま描画**される。背面 revalidate 後の新 HTML で回復するため「一瞬崩れて直る」ように見える

JS は `/_next/` の分岐でネットワーク優先（`:200`）のため陳腐化しない。壊れるのは CSS と media に限られる。

## 既知の限界（この plan では閉じない）

`install` で `skipWaiting()` していないため（`:396` の `SKIP_WAITING` はユーザーが更新トーストを押したときだけ発火）、
新しい SW は waiting のまま留まる。**本 plan の効果は activate 後**であり、デプロイからユーザーが「更新する」を
押すまでの窓は開いたままになる。この残余の窓を閉じるには `skipWaiting` の自動化かナビゲーション側の
build 検証が必要で、UX への影響が別判断になるため本 plan の範囲外とする。

したがって本 plan は「今後のデプロイ跨ぎで不整合が起きないようにする」修正であり、
「次に更新トーストを押すまでの窓を消す」修正ではない。

## Current state

```js
// public/sw.js:3
const CACHE_NAME = 'keepon-v5'

// public/sw.js:180-185
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  )
  self.clients.claim()
})
```

```tsx
// src/components/pwa/ServiceWorkerRegistration.tsx:60
navigator.serviceWorker.register('/sw.js')
```

`next.config.ts` にビルド ID を露出する仕組みは無い（`generateBuildId` / `NEXT_PUBLIC_BUILD_ID` いずれも未定義）。

## 方針

SW の登録 URL にビルド識別子を載せ、SW 側は自身の URL から読んで `CACHE_NAME` を組む。
これによりデプロイごとに別キャッシュになり、**既存の `activate` の掃除ロジックがそのまま
旧ビルドの HTML と CSS を丸ごと捨てる**。`activate` の `names.filter((n) => n !== CACHE_NAME)` が
この plan の要であり、「重複だから」と単純化してはならない。

ビルド識別子の供給源は次の優先順で解決する。3つのビルド経路すべてで値が定まることを要件とする。

| 経路 | 値 |
| --- | --- |
| GitHub Actions（`deploy.yml`） | `process.env.GITHUB_SHA` の先頭12文字 |
| ローカル `pnpm build:cf` | `git rev-parse --short=12 HEAD`（`GITHUB_SHA` 未設定時） |
| `pnpm dev` | 上と同じ。dev では SW を明示 unregister するため実質未使用 |

いずれも失敗した場合は `'dev'` にフォールバックする（ビルドを落とさない）。

## Steps

### 1. `next.config.ts` にビルド識別子を露出する

`NEXT_PUBLIC_SW_VERSION` を `env` で公開する。値は上表の優先順で解決し、`git` 実行は try/catch で囲む。
`child_process` は build 時のみ評価されるため Edge Runtime 制約には触れない。

### 2. `ServiceWorkerRegistration.tsx` の登録 URL にクエリを付ける

```tsx
navigator.serviceWorker.register(`/sw.js?v=${process.env.NEXT_PUBLIC_SW_VERSION}`)
```

登録 URL が変わること自体が SW の更新契機になる。既存の `updatefound` / `waiting` / `SKIP_WAITING` の
経路は変更しない。

### 3. `public/sw.js` の `CACHE_NAME` を自身の URL から導出する

```js
const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const CACHE_NAME = `keepon-${SW_VERSION}`
```

`activate` の掃除ロジックは変更不要。`CACHE_NAME` が変わるだけで旧キャッシュが対象になる。
`CACHE_NAME` を参照している他の箇所（`clearUserCache`、`SKIP_WAITING` ハンドラ等）は
定数名のまま動くため触らない。

### 4. コメントで契約を記録する

`public/sw.js` の `CACHE_NAME` 宣言箇所に、なぜビルド連動にするのか（デプロイ跨ぎで旧 HTML と
消えた CSS の組み合わせが生じるため）と、`activate` の掃除がその回収経路であることを書く。
`ServiceWorkerRegistration.tsx` 側にも、クエリを付ける理由を1行で書く。

## Verify

`public/sw.js` を対象にした自動テストは存在しない（SW 関連は `src/hooks/useSwRevalidation.test.ts` と
`src/hooks/useOfflineCheckin.test.ts` のみで、どちらも client 側フック）。したがって受け入れ条件は次とする。

| 目的 | コマンド | 期待 |
| --- | --- | --- |
| Lint | `node_modules/.bin/biome check --write next.config.ts src/components/pwa/ServiceWorkerRegistration.tsx public/sw.js` | exit 0 |
| 型 | `node_modules/.bin/tsc --noEmit` | exit 0 |
| 既存の SW 関連テスト | `node_modules/.bin/vitest run src/hooks/useSwRevalidation.test.ts src/hooks/useOfflineCheckin.test.ts` | all pass |
| 空白混入 | `git diff --check` | exit 0 |

加えて orchestrator が以下を目視で確認する。

- `NEXT_PUBLIC_SW_VERSION` が3つのビルド経路で解決されること（コードを読んで確認）
- `activate` の掃除ロジックが変更されていないこと
- `CACHE_NAME` の文字列リテラル `'keepon-v5'` が残っていないこと

full gate は orchestrator が `lefthook run pre-push` で実行する（`pnpm exec tsc --noEmit` 単独では
stories の型エラーを見逃す）。

## STOP conditions

- `NEXT_PUBLIC_SW_VERSION` がどのビルド経路かで未定義になり、`CACHE_NAME` が `keepon-undefined` になる場合
- `activate` の掃除ロジックを変更しないと成立しない設計になった場合
- 依存3ファイル（`package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml`）の変更が必要になった場合

## 関連

- `plans/015-sw-user-cache-isolation.md` — 隣接するが**別問題**。015 はネットワーク失敗時に前ユーザーの
  認証済み HTML を返す情報漏れ（security）が主題で、planned at `0f714c1` は SWR 化（`c12c887`）より前。
  015 の Current state は network-first のコードを引用しており前提が古い。SWR 化によって 015 の
  重要度は上がっているが、本 plan とは目的が異なる
