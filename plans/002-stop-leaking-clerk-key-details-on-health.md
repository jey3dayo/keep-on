# Plan 002: 公開ヘルスチェックページから Clerk 認証情報の断片を出さない

> **Executor instructions**: 上から順に実行し、各ステップの検証コマンドと期待結果を確認してから次へ進んでください。
> 「STOP conditions」に該当したら改変を止めて報告します。**コミットはしないでください**。
>
> **Drift check（最初に実行）**:
> `git diff --stat 88f423b..HEAD -- src/app/health/page.tsx src/middleware.ts`
> 出力が空でない場合、下の「Current state」の抜粋と実コードを突き合わせ、一致しなければ STOP。

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `88f423b`, 2026-08-10

## Why this matters

`/health` は `src/middleware.ts` の公開ルート一覧に入っているため、**未認証の誰でも閲覧できます**。
そのページが Clerk の secret key の末尾 4 文字、publishable/secret が live か test か、
sign-in / sign-up URL、`NEXTJS_ENV`、リクエストタイムアウト値を表示しています。
ページ自身が「値は公開しません」と書いているのに、secret key の一部を出しているのは意図と実装の乖離です。
本番の publishable key は `pk_live_...` であり、secret 側も live です。
運用者が必要とするのは「設定されているか / 不整合が無いか」であって、鍵の断片そのものではありません。
このページを「真偽値と状態ラベルだけを出す」形に落とし、認証情報に由来する文字列を一切描画しないようにします。

**この計画で秘密の値を新しいファイルへ写してはいけません。** 参照するのは位置と種別だけです。

## Current state

対象ファイル:

- `src/middleware.ts` — 公開ルート判定。`/health(.*)` が公開扱いになっている。
- `src/app/health/page.tsx` — 314 行のヘルスチェックページ本体。

### `src/middleware.ts:3-10`

```ts
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/offline",
  "/health(.*)",
]);
```

### 出してはいけない値を作っている箇所 — `src/app/health/page.tsx:63-78`

```ts
function getKeyMode(value?: string): "test" | "live" | "unknown" {
  if (!value) {
    return "unknown";
  }
  if (value.startsWith("pk_test") || value.startsWith("sk_test")) {
    return "test";
  }
  if (value.startsWith("pk_live") || value.startsWith("sk_live")) {
    return "live";
  }
  return "unknown";
}

function tailKey(value?: string): string {
  return value ? value.slice(-4) : "none";
}
```

### 描画に載っている箇所 — `src/app/health/page.tsx:150-193`（抜粋）

```ts
const publishableMeta =
  publishableMode === "unknown"
    ? `mode: unknown / tail: ${publishableTail}`
    : `mode: ${publishableMode} / tail: ${publishableTail}`;
const secretMeta =
  secretMode === "unknown"
    ? `mode: unknown / tail: ${secretTail}`
    : `mode: ${secretMode} / tail: ${secretTail}`;
```

さらに `:184` で sign-in / sign-up URL、`:163` で `NEXTJS_ENV`、`:308` で
`Request timeout: {requestTimeoutMs}ms` を描画しています。

### 従うべきリポジトリの規約

- **shadcn/ui の直接編集禁止**: `src/components/ui/` 配下は触らない（`AGENTS.md`）。
  このページは自前の小さな presentational コンポーネントで完結しているので、そのまま使う。
- **Tailwind + CSS 変数トークン**: 既存の `text-muted-foreground` / `border-border/60` などの
  トークンをそのまま使い、色を直書きしない。
- **オブジェクトキーはアルファベット順**（Biome 規約）。既存コードがそうなっています。
- **日本語 UI 文言**: このページの表示文言は日本語です。追加・変更する文言も日本語で。

## Commands you will need

| 目的          | コマンド                            | 成功時の期待 |
| ------------- | ----------------------------------- | ------------ |
| 型チェック    | `pnpm tsc --noEmit`                 | exit 0       |
| Lint / format | `pnpm exec biome check --write src` | exit 0       |
| テスト        | `pnpm test:run`                     | 全 pass      |

## Scope

**In scope**:

- `src/app/health/page.tsx`

**Out of scope（触らない）**:

- `src/middleware.ts` — `/health` を認証必須に変える案は**採らない**。
  外形監視から到達できる必要があるため公開のまま、出力内容だけを絞ります。
- `src/app/debug/repro-concurrency/**` — 別の検出事項です。この計画では触りません。
- `src/lib/server/timeout.ts` — タイムアウト値の取得ロジック自体は変えません。

## Steps

### Step 1: 鍵の断片を作る関数を削除する

`src/app/health/page.tsx` から `tailKey`（:76-78）を**関数ごと削除**し、
その戻り値を使っている `publishableTail` / `secretTail`（:143-144）と、
それらを埋め込んでいる `publishableMeta` / `secretMeta`（:150-155）も削除または書き換えます。

`getKeyMode`（:63-74）も削除します。live / test の別は「鍵そのものの性質」であり、
未認証者に見せる必要がありません。ただし `keyMismatch`（:145）のチェックは
運用上の価値があるので**判定ロジックは残し、結果だけを真偽値で表示**します
（「Publishable/Secret の mode が一致 / 不一致」という日本語ラベルのみ。
どちらが live でどちらが test かは出さない）。

`getKeyMode` を残す形で実装しても構いませんが、その場合も**戻り値を画面へ描画しない**こと。

**Verify**:

```bash
grep -n "tailKey\|slice(-4)" src/app/health/page.tsx
```

→ マッチ 0 件

### Step 2: 描画される check 一覧から値由来の meta を外す

`buildHealthChecks`（:140-202）が返す各 `HealthCheck` について、`meta` フィールドを見直します。

| id                  | 変更後に出してよいもの                                            |
| ------------------- | ----------------------------------------------------------------- |
| `runtime`           | `workers` / `node` の別のみ。**`NEXTJS_ENV` の値は出さない**      |
| `clerk-publishable` | 「設定済み」／「未設定」のみ。meta なし                           |
| `clerk-secret`      | 「設定済み」／「未設定」のみ。meta なし                           |
| `clerk-urls`        | 「URL 設定済み」／「URL 未設定」のみ。**具体的な URL は出さない** |
| `clerk-mode`        | 「一致」／「不一致」のみ。meta なし                               |
| `db-binding`        | 既存のまま（`d1` / `missing` は接続情報ではないので可）           |

`EnvSnapshot` 型のフィールドのうち、変更後に使われなくなるものが出たら
（例: `nextjsEnv`、`signInUrl`、`signUpUrl` を真偽値だけに縮められる場合）、
`getEnvSnapshot` 側も合わせて縮小してください。ただし**型を縮める過程で
`clerkSecretKey` の値そのものをログや別変数へ写さない**こと。
理想は `getEnvSnapshot` が `clerkSecretKeyPresent: boolean` のような真偽値だけを返す形です。
そこまで踏み込むと差分が大きくなる場合は、`EnvSnapshot` は据え置きで
`buildHealthChecks` の出力だけを絞る最小変更でも構いません（その旨を報告に書くこと）。

**Verify**: `pnpm tsc --noEmit` → exit 0

### Step 3: フッターのタイムアウト値表示を落とす

`:307-310` のフッターから `Request timeout: {requestTimeoutMs}ms` の表示を削除します。
内部設定値であり、未認証者に見せる必要がありません。
これに伴い `getRequestTimeoutMs` の import（`:3`）と呼び出し（`:270`）が未使用になるなら、
両方削除します（未使用 import は Biome が検出します）。

`Runtime: {envSnapshot.runtime}` は残して構いません。

**Verify**:

```bash
grep -n "Request timeout" src/app/health/page.tsx
```

→ マッチ 0 件

### Step 4: ページ冒頭の説明文を実態に合わせる

`:284` の「Clerk と DB の設定状態を確認します。値は公開しません。」は、変更後は真になります。
文言を変える必要はありませんが、`metadata.description`（:6）と整合しているか確認してください。

### Step 5: 全体ゲート

**Verify**:

```bash
pnpm exec biome check --write src && pnpm tsc --noEmit && pnpm test:run
```

→ すべて exit 0

### Step 6: 最終的な情報開示の目視確認

変更後の `src/app/health/page.tsx` 全体を読み、
**環境変数やシークレットに由来する文字列が JSX へ渡っている箇所がゼロ**であることを確認します。
渡ってよいのは、そこから導出した真偽値・状態ラベル（`ok` / `warn` / `error`）・
固定の日本語文言だけです。

**Verify**: 次のコマンドの出力を報告に貼り、各行が「真偽値または固定文言のみ」であることを説明する。

```bash
grep -n "envSnapshot\." src/app/health/page.tsx
```

## Test plan

このページには既存テストがなく、この計画でも**新規テストは書きません**。
理由: 変更の本質は「描画に載せる情報を減らす」ことで、Step 1・3・6 の grep が
機械的な検証として十分に機能します。UI スナップショットを足すと、
今後の文言変更のたびに壊れる割に守る性質が薄いためです。

代わりに Done criteria の grep 3 種を回帰ゲートとして扱ってください。

## Done criteria

すべて満たすこと:

- [ ] `pnpm tsc --noEmit` が exit 0
- [ ] `pnpm test:run` が exit 0（既存 148 件が pass、件数は減っていない）
- [ ] `grep -n "tailKey\|slice(-4)" src/app/health/page.tsx` が 0 件
- [ ] `grep -n "Request timeout" src/app/health/page.tsx` が 0 件
- [ ] `grep -n "signInUrl ?? \|signUpUrl ?? \|nextjsEnv ?" src/app/health/page.tsx` が 0 件
      （URL や環境名を文字列展開している箇所が残っていない）
- [ ] `git status --short` の変更ファイルが `src/app/health/page.tsx` のみ
- [ ] Step 6 の grep 結果と、各行が安全である説明が報告に含まれている
- [ ] `plans/README.md` の 002 の行の Status を更新（レビュアーが管理すると言われた場合は不要）

## STOP conditions

- 「Current state」の抜粋と実コードが一致しない
- `EnvSnapshot` を縮小すると `src/app/health/` 外のファイルに型エラーが波及する
  （→ 最小変更方針へ切り替え、報告に書く）
- 同じ検証コマンドが、妥当な修正を 2 回試しても失敗する
- ページを縮小した結果、`/health` が運用上まったく無意味になると判断した場合
  （その判断は運用者のものです。実装を進めず、何が残り何が消えるかを整理して報告）

## Maintenance notes

- 今後 `/health` に項目を足すときの原則: **「設定されているか」は出してよい、
  「何が設定されているか」は出さない**。`/health` は未認証で到達できます。
- レビュー時に見るべき点: JSX に渡っている値が、環境変数から導出した真偽値・
  固定ラベルだけになっているか。
- **意図的に範囲外にしたもの**: `/health` を認証必須にする、または別サブドメインへ移す案。
  外形監視の要件が不明なため、運用者の判断事項として残します。
