# Sentry 統合ガイド

## 概要

Cloudflare Workers で動作する `@sentry/cloudflare` を使用したエラー監視とパフォーマンス追跡。

## セットアップ

### 1. Sentry プロジェクト作成

[Sentry Dashboard](https://sentry.io/) でプロジェクトを作成：

1. **Organizationを作成** (例: `yourcompany`)
2. **プロジェクトを作成** (例: `keep-on`)
3. **プラットフォーム**を選択: `Cloudflare Workers`
4. **DSN** をコピー (例: `https://...@o....ingest.sentry.io/...`)

### 2. 環境変数の設定

#### Cloudflare Secrets

```bash
# SENTRY_DSN を設定
echo '<DSN>' | pnpm wrangler secret put SENTRY_DSN
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
# Sentry DSN
SENTRY_DSN="https://...@o....ingest.sentry.io/..."
```

暗号化：

```bash
pnpm env:encrypt
```

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

- **開発環境**: 100% (`tracesSampleRate: 1.0`)
- **本番環境**: 10% (`tracesSampleRate: 0.1`)

設定は `instrumentation.ts` で管理されています。

### コスト最適化

| 環境 | サンプリングレート | 想定トランザクション数 | 月間コスト（概算）       |
| ---- | ------------------ | ---------------------- | ------------------------ |
| 開発 | 100%               | ~1,000                 | 無料枠内                 |
| 本番 | 10%                | ~100,000 → 10,000      | $26（無料10,000 + 有料） |

**推奨事項：**

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

GitHub Actions で自動的にソースマップをアップロードし、エラーのスタックトレースを人間が読める形式に変換：

### ワークフロー

`.github/workflows/deploy.yml` で自動実行：

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

## トラブルシューティング

### SENTRY_DSN が設定されていない

**エラー:**

```
SENTRY_DSN is not set. Sentry will not be initialized.
```

**解決方法:**

```bash
# Cloudflare Secrets に設定
echo '<DSN>' | pnpm wrangler secret put SENTRY_DSN

# ローカル開発用（.envに追加して暗号化）
pnpm env:encrypt
```

### ソースマップがアップロードされない

**原因:**

- GitHub Secrets が設定されていない
- `SENTRY_AUTH_TOKEN` の権限不足

**解決方法:**

1. [Auth Tokens](https://sentry.io/settings/account/api/auth-tokens/) で新しいトークンを作成
2. `project:releases` 権限を付与
3. GitHub Secrets に設定

### エラーがSentryに表示されない

**確認事項:**

1. **DSN が正しいか確認:**

   ```bash
   pnpm wrangler secret list | grep SENTRY_DSN
   ```

2. **Sentry が初期化されているか確認:**
   - Cloudflare Workers のログに `✅ Sentry initialized for Edge Runtime` が出力されるか

3. **サンプリングレートを一時的に100%に:**

   ```typescript
   // instrumentation.ts
   tracesSampleRate: 1.0,  // すべてのエラーを記録
   ```

4. **ローカルでテスト:**
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
import { startSpan } from "@sentry/cloudflare";

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
