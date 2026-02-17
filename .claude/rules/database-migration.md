---
paths:
  - "drizzle/**/*.sql"
  - "src/db/schema.ts"
  - "scripts/*migrate*.ts"
---

# データベースマイグレーションガイド

## 概要

このプロジェクトでは、Drizzle ORM を使用したデータベースマイグレーションを手動で実行します。
スキーママイグレーションとデータマイグレーションの両方を適切なタイミングで適用するための手順とルールを定義します。

## マイグレーションの種類

### スキーママイグレーション

テーブル構造の変更を行うマイグレーション:

- テーブル作成/削除
- カラム追加/削除/変更
- インデックス追加/削除
- 制約の追加/削除

実行方法:

```bash
pnpm db:generate  # スキーマからマイグレーションファイル生成
pnpm db:migrate   # 本番環境へのマイグレーション適用
```

### データマイグレーション

既存データの変換や初期データの投入を行うマイグレーション:

- デフォルト値の設定
- データ形式の変換
- 既存レコードへの初期値設定

実行方法:

```bash
# スクリプトを作成して実行
node scripts/migrate-user-settings.mjs
```

## デプロイフロー

### 基本原則

スキーマ変更は後方互換性を保ちながら段階的に適用する:

1. PRマージ前: 本番DBにスキーママイグレーションを適用
2. PRマージ: コードをmainブランチにマージ
3. 自動デプロイ: GitHub Actionsが新しいコードをデプロイ
4. データマイグレーション: 必要に応じて手動実行

### 手順詳細

#### 1. スキーママイグレーション生成

```bash
# スキーマを変更
vim src/db/schema.ts

# マイグレーションファイル生成
pnpm db:generate
```

生成されたファイルを確認:

```bash
ls -l drizzle/*.sql
cat drizzle/0XXX_*.sql
```

#### 2. 本番環境へのマイグレーション適用（PRマージ前）

```bash
# 環境変数を読み込んで本番DBに接続
pnpm env:run -- pnpm db:migrate
```

確認:

```bash
# Drizzle Studio で確認
pnpm env:run -- pnpm db:studio

# または Cloudflare Dashboard → D1 で確認
```

#### 3. PRマージと自動デプロイ

```bash
# PRをマージ
gh pr merge <PR番号> --squash

# GitHub Actionsが自動的にデプロイ
# https://github.com/<org>/<repo>/actions で進行状況を確認
```

#### 4. データマイグレーション（必要な場合）

```bash
# スクリプトを作成
cat > scripts/migrate-example.mjs << 'EOF'
import { drizzle } from 'drizzle-orm/cloudflare-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'

const { env } = getCloudflareContext()
const db = drizzle(env.DB)

// データマイグレーション処理
await db.update(users).set({ newField: 'default' })

await client.end()
console.log('Migration completed')
EOF

# 実行
pnpm env:run -- node scripts/migrate-example.mjs
```

## ベストプラクティス

### 後方互換性の確保

スキーマ変更は段階的に実行する:

#### ❌ 非推奨: カラム削除を一度に行う

```typescript
// 古いコードがまだ使用している可能性がある
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  // oldColumn: text('old_column'),  // 削除 - 危険！
  newColumn: text("new_column"),
});
```

#### ✅ 推奨: 段階的なカラム削除

```typescript
// Step 1: 新しいカラムを追加（NULL許可）
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  oldColumn: text("old_column"), // まだ残す
  newColumn: text("new_column"), // 追加
});

// Step 2: コードをデプロイして newColumn を使用開始

// Step 3: oldColumn を削除（次回のマイグレーション）
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  newColumn: text("new_column"),
});
```

### 冪等性の確保

マイグレーションは複数回実行しても安全であること:

#### ✅ 推奨: 存在チェック付き

```sql
-- テーブル作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  timezone TEXT NOT NULL DEFAULT 'UTC'
);

-- カラム追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'new_column'
  ) THEN
    ALTER TABLE users ADD COLUMN new_column TEXT;
  END IF;
END $$;
```

### デフォルト値の設定

新しいカラムには必ずデフォルト値を設定する:

```typescript
// ✅ 推奨: デフォルト値を設定
export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  timezone: text("timezone").notNull().default("UTC"),
  theme: text("theme").notNull().default("light"),
});

// ❌ 非推奨: デフォルト値なし（既存レコードでエラー）
export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  timezone: text("timezone").notNull(), // エラー発生の可能性
});
```

### マイグレーション前の検証

本番適用前に必ず検証する:

```bash
# 1. 開発環境でテスト
pnpm db:push  # 開発DBに直接反映

# 2. マイグレーションファイル生成
pnpm db:generate

# 3. 生成されたSQLを確認
cat drizzle/0XXX_*.sql

# 4. 本番適用
pnpm env:run -- pnpm db:migrate
```

## トラブルシューティング

### マイグレーションが失敗した場合

#### 原因特定

```bash
# Supabase Logs で DB エラーを確認
# 詳細は .claude/rules/testing.md を参照

# ログ収集スクリプト実行
DOTENV_PRIVATE_KEY=$(rg -N '^DOTENV_PRIVATE_KEY=' .env.keys | cut -d= -f2-) \
dotenvx run -- python3 scripts/query-supabase-logs.py
```

#### ロールバック手順

```bash
# 1. Drizzle Studio で現在の状態を確認
pnpm env:run -- pnpm db:studio

# 2. 手動でロールバック SQL を実行
# Supabase Dashboard → SQL Editor で以下を実行:

-- テーブル削除
DROP TABLE IF EXISTS user_settings;

-- カラム削除
ALTER TABLE users DROP COLUMN IF EXISTS new_column;

-- インデックス削除
DROP INDEX IF EXISTS idx_users_email;
```

#### マイグレーション履歴のリセット

```bash
# drizzle/__drizzle_migrations テーブルから失敗したマイグレーションを削除
# Supabase Dashboard → SQL Editor:

DELETE FROM drizzle.__drizzle_migrations
WHERE name = '0XXX_failed_migration.sql';
```

### よくあるエラー

#### エラー: `there is no unique or exclusion constraint matching the ON CONFLICT specification`

原因: `ON CONFLICT` で指定したカラムにユニーク制約が存在しない

解決方法:

```typescript
// ✅ ユニーク制約を追加
export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().unique(), // UNIQUE追加
  timezone: text("timezone").notNull().default("UTC"),
});
```

#### エラー: `column "xxx" of relation "yyy" already exists`

原因: カラムが既に存在している

解決方法:

```sql
-- 存在チェックを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'new_column'
  ) THEN
    ALTER TABLE users ADD COLUMN new_column TEXT;
  END IF;
END $$;
```

#### エラー: `canceling statement due to statement timeout`

原因: クエリのタイムアウト

解決方法:

```bash
# 1. インデックスを追加してクエリを高速化
# 2. バッチ処理に分割
# 3. statement_timeout を一時的に延長（推奨しない）
```

## セキュリティ考慮事項

### 本番環境への接続

本番DBへの接続は必ず暗号化された環境変数を使用する:

```bash
# ✅ 推奨: dotenvx で暗号化
pnpm env:run -- pnpm db:migrate

# ❌ 非推奨: 平文の .env から読み込み
# 秘密鍵が漏洩するリスク
```

### 権限管理

マイグレーション実行には適切な権限が必要:

- Supabase の `service_role` キーを使用
- `public` スキーマへの `USAGE` 権限
- テーブルへの `ALL` 権限

権限エラーが発生した場合:

```bash
# 権限確認スクリプト
pnpm test:db-permissions

# 権限修正スクリプト
pnpm fix:db-permissions
```

詳細は `.claude/rules/troubleshooting.md` を参照してください。

## 参考リンク

- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [D1 Migration Best Practices](https://developers.cloudflare.com/d1/learning/migrations/)

## 関連ドキュメント

- [トラブルシューティング](./troubleshooting.md) - デプロイエラーの解決方法
- [セキュリティガイドライン](./security.md) - 本番環境の認証情報管理
