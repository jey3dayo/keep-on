# Cloudflare Hyperdrive セットアップガイド

## 概要

Cloudflare Hyperdrive は、Cloudflare Workers から PostgreSQL データベースへの接続を高速化するサービスです。
接続プーリングとキャッシングを提供し、レイテンシを大幅に削減します。

## メリット

- **接続の高速化**: コールドスタート時の接続時間を短縮
- **グローバル接続プール**: 世界中のエッジロケーションで接続を再利用
- **クエリキャッシング**: 頻繁に実行されるクエリの結果をキャッシュ

## セットアップ手順

### 1. Hyperdrive の作成

```bash
# Cloudflare ダッシュボードから環境変数を取得
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# Hyperdrive 設定を作成
pnpm wrangler hyperdrive create keep-on-db \
  --connection-string="postgresql://postgres.[project-ref]:[password]@[host]:6543/postgres?pgbouncer=true"
```

実行結果から Hyperdrive ID を取得:

```json
Created new Hyperdrive config
 {"id":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","name":"keep-on-db", ...}
```

### 2. wrangler.jsonc に追加

```jsonc
{
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    },
  ],
}
```

### 3. コードでの使用

`src/lib/db.ts` は既に Hyperdrive に対応しています:

```typescript
// Cloudflare Workers環境でHyperdriveが利用可能な場合
if (typeof globalThis !== "undefined" && "caches" in globalThis) {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const hyperdrive = (env as { HYPERDRIVE?: { connectionString: string } })
      .HYPERDRIVE;
    if (hyperdrive?.connectionString) {
      return hyperdrive.connectionString;
    }
  } catch {
    // Hyperdrive未設定の場合はフォールバック
  }
}
```

### 4. デプロイ

```bash
pnpm build:cf
mise run deploy
```

## 確認方法

デプロイ後、Cloudflare Dashboard で確認:

1. Workers & Pages → keep-on → Settings → Bindings
2. Hyperdrive セクションに設定が表示される

## トラブルシューティング

### Hyperdrive が認識されない

**原因**: binding 名が間違っている

**解決方法**: wrangler.jsonc の binding 名と `src/lib/db.ts` のコードが一致しているか確認

### 接続エラーが発生する

**原因**: 接続文字列が間違っている

**解決方法**:

```bash
# Hyperdrive の設定を確認
pnpm wrangler hyperdrive get keep-on-db

# 再作成する場合
pnpm wrangler hyperdrive delete keep-on-db
pnpm wrangler hyperdrive create keep-on-db --connection-string="..."
```

## 参考リンク

- [Cloudflare Hyperdrive ドキュメント](https://developers.cloudflare.com/hyperdrive/)
- [Wrangler Hyperdrive コマンド](https://developers.cloudflare.com/workers/wrangler/commands/#hyperdrive)
