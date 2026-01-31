# Troubleshooting

## Supabase 接続エラー

**エラー**: `permission denied for schema public`

**原因**: `service_role` にテーブルへのアクセス権限がない。

**解決方法**:

```bash
# 1. 権限状態を確認
pnpm test:db-permissions

# 2. 権限を自動修正
pnpm fix:db-permissions

# 3. 修正結果を確認
pnpm test:supabase
```

**手動で修正する場合**:

Supabase Dashboard → SQL Editor で以下を実行:

```sql
-- public スキーマへのアクセス権限を付与
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 将来作成されるテーブルにも権限を自動付与
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
```

## Cloudflare Workers デプロイエラー

**エラー**: 環境変数が見つからない。

**解決方法**:

```bash
# Secrets を確認
pnpm wrangler secret list

# 不足している場合は設定
./scripts/setup-cloudflare-secrets.sh
```

## dotenvx 復号エラー

**エラー**: `DOTENV_PRIVATE_KEY` が見つからない。

**解決方法**:

```bash
# 環境変数として設定
export DOTENV_PRIVATE_KEY="秘密鍵"

# または .env.keys ファイルから読み込み
DOTENV_PRIVATE_KEY=$(grep '^DOTENV_PRIVATE_KEY=' .env.keys | cut -d= -f2-) dotenvx run -- pnpm dev
```
