---
paths:
  - "drizzle/**/*.sql"
  - "src/db/schema.ts"
  - "scripts/*migrate*.ts"
---

# データベースマイグレーションガイド

## 概要

このプロジェクトは Cloudflare D1 を Drizzle ORM でスキーマ管理しています。
スキーママイグレーションは `wrangler d1 migrations apply`（native migrations）で適用し、
適用済みかどうかは D1 側の `d1_migrations` テーブルで履歴管理されるため、未適用分のみが自動的に適用されます。
データマイグレーション（既存データの変換等）は native migrations の対象外のため、`getDb()` を使った
tsx スクリプトや `wrangler d1 execute` で手動実行します。
スキーママイグレーションとデータマイグレーションの両方を適切なタイミングで適用するための手順とルールを定義します。

### 既存 DB への baseline 適用（実施済み・一回限り）

背景: 2026-08 まで `wrangler d1 execute --file` による direct execute 運用だったため、
本番 D1 の `d1_migrations` テーブルは空のままだった（`0000`〜`0003` はスキーマ上は適用済みだが、
native migrations の適用履歴としては未記録の状態）。

baseline 手順（Orchestrator が実施済み）:

1. `d1_migrations` テーブルを作成
2. `0000`〜`0003` の4件を「適用済み」として `d1_migrations` に INSERT
3. これにより native migrations は `0004` のみを pending として認識する

確認:

```bash
pnpm wrangler d1 migrations list keep-on-db --remote
```

`0004_external_id.sql` のみが pending と表示されれば baseline は正しく完了している。
新規にマイグレーションを追加する場合は、通常どおり `pnpm db:migrate:remote` で追従できる。

## マイグレーションの種類

### スキーママイグレーション

テーブル構造の変更を行うマイグレーション:

- テーブル作成/削除
- カラム追加/削除/変更
- インデックス追加/削除
- 制約の追加/削除

実行方法:

```bash
pnpm db:generate         # スキーマからマイグレーションファイル生成
pnpm db:migrate:local    # 未適用のマイグレーションをローカル D1 に適用
pnpm db:migrate:remote   # 未適用のマイグレーションを本番 D1 に適用
pnpm db:migrate:preview  # 未適用のマイグレーションを preview D1（keep-on-db-preview）に適用
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
# 未適用のマイグレーションをリモート D1 に適用
pnpm db:migrate:remote
```

注意: `main` へのマージ後は `.github/workflows/deploy.yml` が `wrangler deploy` 直前に
`wrangler d1 migrations apply keep-on-db --remote` を自動実行するため、通常は手動適用は不要。
手動適用はホットフィックスなど CI を待たずに本番へ先行適用したい場合のみ行う。

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

`db:migrate:local` / `db:migrate:remote`（`wrangler d1 migrations apply`）は `d1_migrations` テーブルで適用済みファイルを追跡するため、同じマイグレーションファイルを再実行しても自動的にスキップされる。ただし 1 ファイル内の SQL が途中まで実行された状態で失敗した場合は、そのファイルは「未適用」のまま残る（後述の「部分的に失敗したマイグレーションの扱い」を参照）。

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
pnpm db:migrate:local

# 3. 生成されたSQLを確認
cat drizzle/0XXX_*.sql

# 4. リモート D1 へ本番適用
pnpm db:migrate:remote
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
# rollback SQL は drizzle/ の連番マイグレーションとは別物（native migrations の
# 適用履歴に混ぜない）ため、db:migrate:* ではなく wrangler d1 execute --file を直接使う
cat > scripts/rollback-example.sql << 'EOF'
DROP TABLE IF EXISTS user_settings;
ALTER TABLE User DROP COLUMN new_column;
DROP INDEX IF EXISTS idx_users_email;
EOF

dotenvx run -- wrangler d1 execute keep-on-db --local --file=scripts/rollback-example.sql
# 確認できたらリモートにも適用
dotenvx run -- wrangler d1 execute keep-on-db --remote --file=scripts/rollback-example.sql
```

Cloudflare Dashboard → Workers & Pages → D1 → `keep-on-db` → **Console** タブから直接 SQL を実行することもできる（`wrangler d1 execute` と同じ権限）。

#### 部分的に失敗したマイグレーションの扱い

`db:migrate:local` / `db:migrate:remote`（`wrangler d1 migrations apply`）はファイル単位で成功したものだけを `d1_migrations` に記録するため、1 ファイル内の SQL が途中まで実行された状態で失敗した場合はそのファイルは「未適用」のまま残る。この状態で再実行すると、既に適用済みの DDL に対して `ALTER TABLE` 等が再実行されエラーになることがある。

```bash
# 現在のスキーマ状態を確認し、既に反映済みの変更を除いてマイグレーションファイルを手直ししてから再実行する
pnpm wrangler d1 execute keep-on-db --remote --command "PRAGMA table_info(User);"
pnpm wrangler d1 migrations list keep-on-db --remote
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
pnpm db:migrate:remote

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
