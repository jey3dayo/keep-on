# Plan 034: ナビゲーション SWR の stale 提供に鮮度上限を設ける

> **Executor instructions**: この plan を順に実施し、検証をすべて実行する。STOP 条件に当たったら停止して報告する。
>
> **Drift check**: `git diff --stat d35391d..HEAD -- public/sw.js src/constants/pwa.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED（キャッシュ戦略の永続挙動を変える）
- **Depends on**: `plans/032`（DONE `ba13ba5`）
- **Category**: correctness（実機で観測された機能不具合）
- **Planned at**: commit `d35391d`, 2026-09-02
- **Tracks**: Linear JEY-636 の残存部分

## Why this matters

実機 iPhone のスクリーンショット2枚（2026-09-02 00:10 と 00:11、1分差）で次が観測された。

- 00:10 — **CSS が全く適用されていない素の HTML**。ナビが `<ul><li>` の既定リスト、リンクが既定色、見出しが既定セリフ体、ロゴ SVG が巨大。本文の日付は **`8月31日（月）`**
- 00:11 — 正常表示。本文の日付は **`9月2日（水）`**

**発生条件はインストール済み PWA（standalone）の初回起動である。** ユーザーの報告:
「1回目起動したら、こうなった / 2回目は起動した」。つまり初回起動で stale HTML が提供され、
背面 revalidate が新しい HTML を取得した結果、2回目の起動で正常表示になっている。

経路はこうなる。

1. インストール時（8/31）に SW が `/dashboard` の HTML をキャッシュ
2. 9/2 の初回起動で、その 8/31 HTML が鮮度判定なしで stale 提供される
3. その HTML が参照する旧ハッシュの CSS は origin から削除済み（OpenNext + Workers は旧バージョンを保持しない）→ 取得失敗 → **未スタイル描画**
4. 背面 revalidate が新 HTML をキャッシュへ書く
5. 2回目の起動で正常表示

つまり **9/2 に 8/31 の HTML が配信された**。`plans/031` / `032` はデプロイ跨ぎのアセット不整合を扱ったが、
**stale HTML の鮮度そのものに上限が無い**という別の欠陥が残っている。

これは見た目の問題ではない。**キャッシュされた HTML には日付が焼き込まれている**（`/dashboard` の
「9月2日（水）」「今日の習慣」）。習慣トラッカーで「今日」が2日前になるのは機能的な誤りである。
同時に、古い HTML ほど参照するハッシュ付きアセットが origin から消えている確率が高く、
未スタイル描画の主因にもなる。

既存の KV キャッシュはこの問題を `dateKey` で解決している（`.claude/rules/caching-strategy.md`:
「`dateKey` によるバージョン管理（日付が変わるとミス）」）。**SW のナビゲーション SWR だけがその概念を
持っていない。**

`c12c887` が SWR を導入した意図は `public/sw.js` のコメントに明記されている。

> stale 即応は直前セッション本人の再訪を前提とした意図的なトレードオフ。

**「直前セッションの再訪」という目的なら鮮度上限は短くてよい。** 上限を設けても導入目的は損なわれない。

## 本番実測（2026-09-02、デプロイ `c4e7429` 後）

実ブラウザ（ログイン済み、`/dashboard`）で次を確認した。

1. **スタンプが書かれている** — キャッシュされた `/dashboard` に `x-keepon-cached-at: 1788279745689`（経過10秒）
2. **鮮度上限が実際に効く** — キャッシュ本文を識別可能なマーカーへ差し替え、スタンプを2時間前（`ageMin: 120`）に
   改竄してリロードした結果、**マーカーは表示されず**ネットワークから本物が描画された
   （`markerShown: false` / `title: ダッシュボード - KeepOn` / `h1: 今日`）
3. **自己修復する** — 直後のキャッシュはマーカーを含まず実 HTML（73,663 バイト）に置き換わり、
   スタンプも更新されていた（経過24秒）
4. ビルドスコープ化との併存 — `caches` は `keepon-c4e74298d42e` の1件のみ

**未実証**: オフライン時に期限切れキャッシュが返る経路と、そのときの `NAV_STALE_SERVED` 表示は
実測していない（機内モードでの検証が必要）。コードとレビューでは確認済み。

## Current state

```js
// public/sw.js:221-227（鮮度を一切見ない）
if (cached) {
  // stale 即応は直前セッション本人の再訪を前提とした意図的なトレードオフ。
  // セッション切れ・ユーザー交代時の露出は、背面再検証の NAV_AUTH_LOST と ServiceWorkerRegistration の
  // CLEAR_USER_CACHE で数秒内に回収する。
  broadcastToClients({ path: url.pathname, type: 'NAV_STALE_SERVED' }).catch(() => undefined)
  return { response: cached, revalidate: () => revalidateNavigation(request, cache, url.pathname) }
}
```

```js
// public/sw.js:236 付近（キャッシュ投入。タイムスタンプを持たない）
if (networkResp.ok && !networkResp.redirected) {
  await cache.put(request, networkResp.clone())
  return { response: networkResp, revalidate: null }
}
```

`revalidateNavigation` も同様に `cache.put` するため、そちらにも同じ処理が必要になる。

## 方針

キャッシュ投入時に**投入時刻をカスタムヘッダーとして刻み**、stale 提供の直前に鮮度を判定する。

- 上限を超えていたら **stale 提供せず network-first にフォールスルー**する（既存の `cached` が無い場合と同じ経路）。
  ネットワークが失敗したときだけ、期限切れでも `cached` を返す（オフラインで白画面にしない）
- 上限は **1時間**とする。「直前セッション本人の再訪」を満たすのに十分で、日付跨ぎと
  デプロイ跨ぎのほとんどを排除できる

`dateKey` 方式（日付文字列の比較）は採らない。SW は `ko_tz` cookie を読めず、ユーザーのタイムゾーンでの
「今日」を確実に判定できないため。経過時間による上限はタイムゾーンに依存せず、同じ効果が得られる。

## Scope

**In scope**:

- `public/sw.js` — ナビゲーション SWR の cached 分岐に鮮度判定を追加。`cache.put` の2箇所（初回投入と
  `revalidateNavigation`）でタイムスタンプヘッダーを付与
- `src/constants/pwa.ts` — 上限値の定数を追加（`sw.js` と同期する旨をコメント）

**Out of scope**:

- `activate` の掃除ロジック
- 静的アセット（`/_next/`）の戦略
- `skipWaiting` の自動化（`JEY-637`）
- ユーザー別キャッシュ名前空間

## Steps

### Step 1: 定数を追加する

`src/constants/pwa.ts` に追記する。既存のコメント様式（「sw.js と同期すること」）に合わせる。

```ts
/** ナビゲーション SWR で stale 提供を許す上限（sw.js と同期すること） */
export const SW_NAV_STALE_MAX_AGE_MS = 60 * 60 * 1000
```

### Step 2: `public/sw.js` にタイムスタンプ付与と鮮度判定を実装する

`CACHE_NAME` の近くに定数とヘッダー名を置く。**値は Step 1 と一致させ、同期先をコメントに書く。**

```js
// 同期先は src/constants/pwa.ts の SW_NAV_STALE_MAX_AGE_MS
const NAV_STALE_MAX_AGE_MS = 60 * 60 * 1000
const NAV_CACHED_AT_HEADER = 'x-keepon-cached-at'
```

**投入側** — `cache.put` の前に、投入時刻ヘッダーを足した Response を作る。ヘルパー関数を1つ作り、
初回投入と `revalidateNavigation` の両方から使う。

- 元の Response の `body` / `status` / `statusText` / 既存ヘッダーをすべて保持し、
  `NAV_CACHED_AT_HEADER` に `Date.now()` の文字列を追加する
- `Response` は body を一度しか読めないため、`clone()` の扱いを間違えないこと

**提供側** — `if (cached)` の中で鮮度を判定する。

- `cached.headers.get(NAV_CACHED_AT_HEADER)` を数値化する
- **ヘッダーが無い、数値にならない、または `Date.now() - cachedAt > NAV_STALE_MAX_AGE_MS` の場合は
  stale 提供しない**（ヘッダー無しは本 plan 以前に投入された古いキャッシュなので、期限切れ扱いにする）
- 期限切れの場合は既存の network-first 経路（`try { fetch(...) }` 以下）へ進む。
  **その経路の `catch` は既に `cached || caches.match(OFFLINE_URL)` を返すため、オフライン時は
  期限切れキャッシュが使われる。この挙動は維持する**
- 鮮度が有効な場合の挙動は現状と一切変えない（`NAV_STALE_SERVED` の broadcast と背面 revalidate）

### Step 3: コメントで契約を記録する

`if (cached)` の分岐に、なぜ上限が必要かを書く。既存コメント（「直前セッション本人の再訪を前提とした
意図的なトレードオフ」）は残し、その下に上限の理由を足す。

- キャッシュされた HTML には日付が焼き込まれており、日付を跨いだ stale 提供は機能的な誤りになる
- 古い HTML は参照するハッシュ付きアセットが origin から消えている確率が高い
- 実機で 8月31日 の HTML が 9月2日 に配信され、CSS 未適用で描画された（2026-09-02 実測）

## Verify

`public/sw.js` を対象にした自動テストは存在しない。受け入れ条件は次とする。

| 目的 | コマンド | 期待 |
| --- | --- | --- |
| Lint | `node_modules/.bin/biome check --write public/sw.js src/constants/pwa.ts` | exit 0 |
| 型 | `node_modules/.bin/tsc --noEmit` | exit 0 |
| SW 関連の既存テスト | `node_modules/.bin/vitest run src/hooks/useSwRevalidation.test.ts src/hooks/useOfflineCheckin.test.ts src/lib/pwa` | all pass |
| 空白混入 | `git diff --check` | exit 0 |

報告に必ず含めること。

- `git diff public/sw.js` の全文
- `NAV_STALE_MAX_AGE_MS` と `SW_NAV_STALE_MAX_AGE_MS` の値が一致していること
- `activate` の掃除ロジックと `/_next/` の分岐が無変更であること
- オフライン時（`fetch` が throw）に期限切れキャッシュが返る経路が維持されていること（該当コード引用）

orchestrator が別途、実ブラウザで鮮度上限の動作を実測する。

## STOP conditions

- `Response` の body 再構成でヘッダー付与が実現できない場合
- `activate` の掃除ロジックや `/_next/` の分岐の変更が必要になった場合
- オフライン時に期限切れキャッシュを返せなくなる設計になった場合
- 依存3ファイル（`package.json` の `dependencies` / `pnpm-lock.yaml` / `pnpm-workspace.yaml`）の変更が必要になった場合

## 関連

- `plans/031` / `plans/032` — デプロイ跨ぎのアセット不整合。本 plan は別軸（stale HTML の鮮度）
- `JEY-637` — `skipWaiting` 自動化。デプロイ〜更新までの窓を閉じる補完的な修正
- `.claude/rules/caching-strategy.md` — KV キャッシュの `dateKey` 方式。本 plan が SW 側で同じ問題に対処する
