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
pnpm db:migrate:remote -- drizzle/<migration>.sql  # リモート D1 へのマイグレーション適用
```

### データマイグレーション

既存データの変換や初期データの投入を行うマイグレーション:

- デフォルト値の設定
- データ形式の変換
- 既存レコードへの初期値設定

実行方法:

```bash
# スクリプトを作成して実行（tsx 経由。dotenvx で復号した環境変数が必要）
pnpm env:run -- tsx scripts/migrate-user-settings.ts
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
# 環境変数を読み込んでリモート D1 に適用
pnpm db:migrate:remote -- drizzle/<migration>.sql
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

`getDb()`（`src/lib/db.ts`）が D1 バインディングを解決するので、スクリプトからは直接呼び出せる。実例は `scripts/migrate-user-settings.ts` を参照:

```typescript
// scripts/migrate-example.ts
import { eq } from 'drizzle-orm'
import { users } from '@/db/schema'
import { getDb } from '@/lib/db'

async function main() {
  const db = getDb()
  await db.update(users).set({ newField: 'default' }).where(eq(users.newField, null))
  console.log('Migration completed')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
```

```bash
# 実行（tsx 経由。dotenvx で復号した環境変数が必要）
pnpm env:run -- tsx scripts/migrate-example.ts
```

## ベストプラクティス

### 後方互換性の確保

スキーマ変更は段階的に実行する:

#### ❌ 非推奨: カラム削除を一度に行う

```typescript
// 古いコードがまだ使用している可能性がある
export const users = sqliteTable("User", {
  id: text("id").primaryKey(),
  // oldColumn: text('old_column'),  // 削除 - 危険！
  newColumn: text("new_column"),
});
```

#### ✅ 推奨: 段階的なカラム削除

```typescript
// Step 1: 新しいカラムを追加（NULL許可）
export const users = sqliteTable("User", {
  id: text("id").primaryKey(),
  oldColumn: text("old_column"), // まだ残す
  newColumn: text("new_column"), // 追加
});

// Step 2: コードをデプロイして newColumn を使用開始

// Step 3: oldColumn を削除（次回のマイグレーション）
export const users = sqliteTable("User", {
  id: text("id").primaryKey(),
  newColumn: text("new_column"),
});
```

### 冪等性の確保

マイグレーションは複数回実行しても安全であること。SQLite（D1）には Postgres の `DO $$ ... END $$` のような条件分岐 DDL がないため、以下の方法で冪等性を確保する:

#### ✅ 推奨: 存在チェック付き

```sql
-- テーブル作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  timezone TEXT NOT NULL DEFAULT 'UTC'
);
```

カラム追加は `ALTER TABLE ... ADD COLUMN` に `IF NOT EXISTS` 相当の構文がない。事前に存在確認してから実行する:

```bash
# 既存カラムを確認してから ALTER TABLE を実行するか判断する
pnpm wrangler d1 execute keep-on-db --local --command "PRAGMA table_info(User);"
```

`db:migrate:local` / `db:migrate:remote`（`wrangler d1 execute --file`）は適用済みマイグレーションを追跡しないため、同じファイルを再実行すると `duplicate column name` 等で失敗する。再実行が必要な場合は生成された SQL を直接編集して未適用分だけに絞る。

### デフォルト値の設定

新しいカラムには必ずデフォルト値を設定する:

```typescript
// ✅ 推奨: デフォルト値を設定
export const userSettings = sqliteTable("UserSettings", {
  userId: text("user_id").primaryKey(),
  timezone: text("timezone").notNull().default("UTC"),
  theme: text("theme").notNull().default("light"),
});

// ❌ 非推奨: デフォルト値なし（既存レコードでエラー）
export const userSettings = sqliteTable("UserSettings", {
  userId: text("user_id").primaryKey(),
  timezone: text("timezone").notNull(), // エラー発生の可能性
});
```

### マイグレーション前の検証

本番適用前に必ず検証する:

```bash
# 1. マイグレーションファイル生成
pnpm db:generate

# 2. ローカル D1 で検証
pnpm db:migrate:local -- drizzle/<migration>.sql

# 3. 生成されたSQLを確認
cat drizzle/0XXX_*.sql

# 4. リモート D1 へ本番適用
pnpm db:migrate:remote -- drizzle/<migration>.sql
```

## トラブルシューティング

### マイグレーションが失敗した場合

#### 原因特定

```bash
# リアルタイムログで DB エラーを確認（本番）
pnpm cf:logs

# または Cloudflare Dashboard → Workers & Pages → keep-on → Logs
```

D1 自体のクエリ統計は Cloudflare Dashboard → Workers & Pages → D1 → `keep-on-db` → **Metrics** で確認できる。

#### ロールバック手順

```bash
# 1. Drizzle Studio で現在の状態を確認
pnpm env:run -- pnpm db:studio

# 2. ロールバック SQL をファイル化して適用（ローカルで先に確認）
cat > drizzle/rollback-example.sql << 'EOF'
DROP TABLE IF EXISTS user_settings;
ALTER TABLE User DROP COLUMN new_column;
DROP INDEX IF EXISTS idx_users_email;
EOF

pnpm db:migrate:local -- drizzle/rollback-example.sql
# 確認できたらリモートにも適用
pnpm db:migrate:remote -- drizzle/rollback-example.sql
```

Cloudflare Dashboard → Workers & Pages → D1 → `keep-on-db` → **Console** タブから直接 SQL を実行することもできる（`wrangler d1 execute` と同じ権限）。

#### 部分的に失敗したマイグレーションの扱い

`db:migrate:local` / `db:migrate:remote`（`wrangler d1 execute --file`）は適用履歴を管理しないため、ファイル中の一部の SQL 文だけ実行された状態で失敗する可能性がある。

```bash
# 現在のスキーマ状態を確認してから、未実行分だけを含む SQL を再作成する
pnpm wrangler d1 execute keep-on-db --remote --command "PRAGMA table_info(User);"
```

### よくあるエラー

#### エラー: `UNIQUE constraint failed`

原因: `onConflictDoUpdate` 等で指定したカラムにユニーク制約が存在しない、または既存データに重複がある

解決方法:

```typescript
// ✅ ユニーク制約を追加
export const userSettings = sqliteTable("UserSettings", {
  userId: text("user_id").primaryKey().unique(), // UNIQUE追加
  timezone: text("timezone").notNull().default("UTC"),
});
```

#### エラー: `duplicate column name: xxx`

原因: カラムが既に存在している（同じマイグレーションファイルを再実行した等）

解決方法: SQLite には条件付き `ALTER TABLE` がないため、事前に `PRAGMA table_info(<table>)` で存在確認するか、生成済み SQL から該当行を削除して再適用する。

#### エラー: マイグレーション実行がタイムアウトする

原因: 大きなテーブルへの `ALTER TABLE` / バックフィルクエリが D1 のクエリ実行時間上限に達している

解決方法:

```bash
# 1. インデックスを追加してクエリを高速化
# 2. バッチ処理に分割（一度に更新する行数を減らす）
# 3. wrangler d1 execute --batch-size で1回あたりの実行行数を調整
```

## セキュリティ考慮事項

### 本番環境への接続

本番DBへの接続は必ず暗号化された環境変数を使用する:

```bash
# ✅ 推奨: dotenvx 経由の migrate スクリプト（内部で dotenvx run を使用）
pnpm db:migrate:remote -- drizzle/<migration>.sql

# ❌ 非推奨: 平文の .env から読み込み
# 秘密鍵が漏洩するリスク
```

### 権限管理

D1 への操作は Cloudflare API トークンで認可される（Postgres のようなスキーマ/ロール単位の権限モデルはない）:

- `pnpm wrangler d1 execute` / `pnpm db:migrate:*` は `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` の権限をそのまま使う
- API トークンは D1 の編集権限を持つ最小スコープで発行する（詳細は `.claude/rules/security.md`）

権限エラー（`Authentication error`）が発生した場合は、環境変数と API トークンのスコープを確認する:

```bash
pnpm wrangler d1 list
```

詳細は `.claude/rules/troubleshooting.md` を参照してください。

## 参考リンク

- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [D1 Migration Best Practices](https://developers.cloudflare.com/d1/learning/migrations/)

## 関連ドキュメント

- [トラブルシューティング](./troubleshooting.md) - デプロイエラーの解決方法
- [セキュリティガイドライン](./security.md) - 本番環境の認証情報管理
