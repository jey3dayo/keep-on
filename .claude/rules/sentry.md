# Sentry 統合ガイド

## 概要

`@sentry/nextjs` によるエラー監視とパフォーマンス追跡。OpenNext + Cloudflare Workers 上で動作する。

Sentry 公式の「Next.js on Cloudflare」ガイドに従い、`@sentry/cloudflare` の内部 API（`CloudflareClient` /
`makeCloudflareTransport` / `defaultStackParser`）を手組みしない。過去にその方式で webpack のモジュール解決が
失敗し実装を撤去した経緯があるため（#146, commit 01a7724）、`@sentry/nextjs` の公開 API のみを使う。

### 構成ファイル

- `instrumentation.ts` — サーバー / edge の `Sentry.init`、`onRequestError`
- `instrumentation-client.ts` — クライアントの `Sentry.init`、`onRouterTransitionStart`
- `next.config.ts` — `withSentryConfig` でのラップ（source map は auth token 設定時のみ）
- `src/lib/sentry.ts` — `captureException` / `captureMessage` / `withSentryScope` ラッパー

### Cloudflare Workers 側の要件

`wrangler.jsonc` で以下が必須（公式要件）：

- `compatibility_flags` に `nodejs_compat`
- `compatibility_date` が `2025-08-16` 以降（SDK が送信に使う `https.request` の導入日）

## セットアップ

### 1. Sentry プロジェクト作成

[Sentry Dashboard](https://sentry.io/) でプロジェクトを作成：

1. Organizationを作成 (例: `jey3dayo`)
2. プロジェクトを作成 (例: `keep-on`)
3. プラットフォームを選択: `Next.js`
4. DSN をコピー (例: `https://...@o....ingest.us.sentry.io/...`)

### 2. 環境変数の設定

#### Cloudflare Secrets

```bash
# SENTRY_DSN を設定（値はプロンプトへ対話入力する）
pnpm cf:secret put SENTRY_DSN
```

#### GitHub Secrets

GitHub リポジトリの Settings → Secrets and variables → Actions で設定：

| Secret名            | 説明                | 取得方法                                                                                                        |
| ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `SENTRY_AUTH_TOKEN` | Sentry API トークン | [Auth Tokens](https://sentry.io/settings/account/api/auth-tokens/) → Create New Token → `project:releases` 権限 |
| `SENTRY_ORG`        | Sentry Organization | Dashboard の URL から取得（例: `yourcompany`）                                                                  |
| `SENTRY_PROJECT`    | Sentry Project名    | プロジェクト名（例: `keep-on`）                                                                                 |

### 3. ローカル開発用の設定

`.env` に追加（dotenvx で暗号化）：

```bash
# サーバー / edge ランタイム用
SENTRY_DSN="https://...@o....ingest.us.sentry.io/..."
# クライアントバンドルに焼き込む用（ビルド時に必要。DSN は公開値）
NEXT_PUBLIC_SENTRY_DSN="https://...@o....ingest.us.sentry.io/..."
```

登録（値ごとに暗号化される）：

```bash
pnpm exec dotenvx set SENTRY_DSN "<DSN>"
pnpm exec dotenvx set NEXT_PUBLIC_SENTRY_DSN "<DSN>"
```

`NEXT_PUBLIC_SENTRY_DSN` はビルド時に JS バンドルへ焼き込まれるため、`build:cf`（`dotenvx run --overload`）
経由でビルドしないとクライアント側の Sentry が無効になる。

DSN・Cloudflare の credential は 1Password の `Personal / KeepOn`（API Credential）に保管している。

## 使用方法

### エラーのキャプチャ

```typescript
import { captureException } from "@/lib/sentry";

try {
  // エラーが発生する可能性のある処理
  await someOperation();
} catch (error) {
  captureException(error, {
    userId: user.id,
    operationName: "someOperation",
  });
  throw error;
}
```

### メッセージのログ

```typescript
import { captureMessage } from "@/lib/sentry";

// 情報ログ
captureMessage("User logged in", "info");

// 警告
captureMessage("API rate limit approaching", "warning");

// エラー
captureMessage("Critical system error", "error");
```

### スコープ内での実行

```typescript
import { withSentryScope } from "@/lib/sentry";

await withSentryScope(
  async () => {
    // エラーが発生する可能性のある処理
    return await someOperation();
  },
  {
    tags: {
      operation: "user-sync",
      environment: "production",
    },
    context: {
      userId: user.id,
      metadata: {
        /* ... */
      },
    },
  },
);
```

## パフォーマンス監視

### サンプリングレート

本番環境では CPU Time 課金を抑えるため、サンプリングレートを低く設定：

- 開発環境: 100% (`tracesSampleRate: 1.0`)
- 本番環境: 10% (`tracesSampleRate: 0.1`)

設定は `instrumentation.ts` で管理されています。

### コスト最適化

| 環境 | サンプリングレート | 想定トランザクション数 | 月間コスト（概算）       |
| ---- | ------------------ | ---------------------- | ------------------------ |
| 開発 | 100%               | ~1,000                 | 無料枠内                 |
| 本番 | 10%                | ~100,000 → 10,000      | $26（無料10,000 + 有料） |

### 推奨事項

- 初期は 10% で様子を見る
- トラフィックが増えたら 5% に下げる
- クリティカルなエラーは常に記録（`beforeSend` でフィルタリング）

## エラーフィルタリング

特定のエラーを Sentry に送信しない：

```typescript
// instrumentation.ts
beforeSend(event) {
  // ユーザーキャンセルは無視
  if (event.exception?.values?.[0]?.value?.includes('user cancelled')) {
    return null
  }

  // 401 エラーは無視（認証エラーは正常な動作）
  if (event.exception?.values?.[0]?.value?.includes('Unauthorized')) {
    return null
  }

  return event
}
```

## ソースマップのアップロード

`next.config.ts` の `withSentryConfig` が担当する。`SENTRY_AUTH_TOKEN` が設定されているときだけ
アップロードが有効になるため、トークンを持たないローカルビルドは何も送らない。

### ワークフロー

`.github/workflows/deploy.yml` の Build ステップに `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` を
渡してある（GitHub Secrets に登録済み）。`sentry-cli` を別ステップで叩く必要はない。トークンは Sentry の
**Organization Auth Token**（scope: `org:ci` = Source Map Upload / Release Creation / Code Mappings）で、
1Password の `Personal / KeepOn` にも保管している。

`sentry-cli` を使う場合の代替（現在は未使用。二重管理になるのでどちらか一方に統一する）：

```yaml
- name: Upload source maps to Sentry
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
  run: |
    pnpm sentry-cli releases new "${{ github.sha }}"
    pnpm sentry-cli releases files "${{ github.sha }}" upload-sourcemaps .open-next --url-prefix "~/"
    pnpm sentry-cli releases finalize "${{ github.sha }}"
```

### 手動アップロード

```bash
# ビルド実行
pnpm build:cf

# ソースマップをアップロード
pnpm sentry-cli releases new "$(git rev-parse HEAD)"
pnpm sentry-cli releases files "$(git rev-parse HEAD)" upload-sourcemaps .open-next --url-prefix "~/"
pnpm sentry-cli releases finalize "$(git rev-parse HEAD)"
```

## API で issue を参照する

ブラウザを開かずに issue やイベントを確認できる。トークンは 1Password から読み出し、シェル履歴やログへ出さない。

```bash
T=$(op item get ikksduz7inq3ms2vifjklr2sui --vault Personal \
  --fields "API Read Token (event/org/project:read)" --reveal)

# 直近 24h の issue 一覧
curl -s -H "Authorization: Bearer $T" \
  "https://sentry.io/api/0/projects/jey3dayo/keep-on/issues/?statsPeriod=24h"

# 特定 issue の最新イベント
curl -s -H "Authorization: Bearer $T" \
  "https://sentry.io/api/0/issues/<issue-id>/events/latest/"
```

`statsPeriod` に指定できるのは `''` / `24h` / `14d` のみ（`1h` は 400 になる）。

claude.ai の Sentry コネクタ（`mcp__claude_ai_Sentry__*`）は `jey3dayo` org の権限を持たず 403 になるため、
この API 経路を使う。

## トラブルシューティング

### SENTRY_DSN が設定されていない

#### エラー

```text
SENTRY_DSN is not set. Sentry will not be initialized.
```

#### 解決方法

```bash
# Cloudflare Secrets に設定
pnpm cf:secret put SENTRY_DSN

# ローカル開発用（.envに追加して暗号化）
pnpm env:encrypt
```

### ソースマップがアップロードされない

#### 原因

- GitHub Secrets が設定されていない
- `SENTRY_AUTH_TOKEN` の権限不足

#### 解決方法

1. [Auth Tokens](https://sentry.io/settings/account/api/auth-tokens/) で新しいトークンを作成
2. `project:releases` 権限を付与
3. GitHub Secrets に設定

### エラーがSentryに表示されない

#### 確認事項

1. DSN が正しいか確認:

   ```bash
   pnpm wrangler secret list | grep SENTRY_DSN
   ```

2. Sentry が初期化されているか確認:
   - Cloudflare Workers のログに `✅ Sentry initialized for Edge Runtime` が出力されるか

3. サンプリングレートを一時的に100%に:

   ```typescript
   // instrumentation.ts
   tracesSampleRate: 1.0,  // すべてのエラーを記録
   ```

4. ローカルでテスト:

   ```bash
   pnpm env:run -- pnpm dev
   # 意図的にエラーを発生させる
   ```

## ベストプラクティス

### 1. コンテキストを常に追加

```typescript
captureException(error, {
  userId: user.id,
  operation: "createHabit",
  habitId: habit.id,
});
```

### 2. 機密情報をフィルタリング

```typescript
// instrumentation.ts
beforeSend(event) {
  // パスワードやトークンを削除
  if (event.request?.data) {
    delete event.request.data.password
    delete event.request.data.token
  }
  return event
}
```

### 3. エラーをグループ化

```typescript
captureException(new Error("Database query failed"), {
  fingerprint: ["database-error", operation],
});
```

### 4. パフォーマンス監視を活用

```typescript
import { startSpan } from "@sentry/nextjs";

const result = await startSpan(
  { name: "database-query", op: "db.query" },
  async () => {
    return await db.select().from(users);
  },
);
```

## 参考リンク

- [Sentry Cloudflare Workers ドキュメント](https://docs.sentry.io/platforms/javascript/guides/cloudflare/)
- [Sentry CLI リファレンス](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Cloudflare Workers デプロイ](https://developers.cloudflare.com/workers/)
