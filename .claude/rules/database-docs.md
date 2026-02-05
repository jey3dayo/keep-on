---
paths:
  [
    "src/db/schema.ts",
    "scripts/generate-dbml.ts",
    "docs/database/**",
    ".github/workflows/dbdocs.yml",
  ]
---

# データベースドキュメント管理ガイド

## 概要

このプロジェクトでは、Drizzle ORMスキーマから自動的にDBMLを生成し、dbdocs.ioでデータベースドキュメントを公開しています。

## 関連ファイル

| ファイル                       | 説明                        |
| ------------------------------ | --------------------------- |
| `src/db/schema.ts`             | Drizzle ORMスキーマ定義     |
| `scripts/generate-dbml.ts`     | DBML生成スクリプト          |
| `docs/database/schema.dbml`    | 生成されたDBML（自動生成）  |
| `.github/workflows/dbdocs.yml` | GitHub Actions ワークフロー |

## ツール構成

| ツール                 | 用途                                   |
| ---------------------- | -------------------------------------- |
| drizzle-docs-generator | DrizzleスキーマからDBMLを生成          |
| dbdocs                 | DBMLをdbdocs.ioにデプロイ              |
| GitHub Actions         | スキーマ変更時に自動でドキュメント更新 |

## ローカルでのドキュメント生成

### 1. DBMLを生成

```bash
pnpm db:docs:generate
```

生成されたDBMLは `docs/database/schema.dbml` に出力されます。

### 2. dbdocs.ioにデプロイ

初回のみ、dbdocsにログインします:

```bash
pnpm dbdocs login
```

ドキュメントをデプロイ:

```bash
pnpm db:docs:push
```

### 3. ワンコマンド実行

生成とデプロイを一度に実行:

```bash
mise run db:docs
```

## GitHub Actions 自動デプロイ

### トリガー条件

以下のいずれかで自動デプロイが実行されます:

- `main` ブランチへのプッシュ（`src/db/schema.ts` 変更時）
- `docs/database/**` の変更時
- ワークフローファイル自体の変更時
- 手動トリガー（`workflow_dispatch`）

### 必要な GitHub Secrets

| Secret名       | 説明               | 取得方法                                     |
| -------------- | ------------------ | -------------------------------------------- |
| `DBDOCS_TOKEN` | dbdocs認証トークン | `pnpm dbdocs login` → `pnpm dbdocs token -g` |

## スキーマにドキュメントを追加

DrizzleスキーマにJSDocコメントを追加することで、ドキュメント化できます:

```typescript
/**
 * ユーザー情報テーブル
 * Clerkで認証されたユーザーのデータを管理
 */
export const users = sqliteTable("User", {
  /** ユーザーID (CUID2形式) */
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  /** Clerk認証ID */
  clerkId: text("clerkId").notNull().unique(),
  // ...
});
```

`drizzle-docs-generator` はJSDocコメントを自動的に抽出し、DBMLの `note:` 属性に変換します。dbdocs.io上でカラムの説明がツールチップとして表示されます。

## ドキュメントの確認

デプロイ後、以下のURLでドキュメントを確認できます:

```text
https://dbdocs.io/keep-on
```

## トラブルシューティング

### DBML生成エラー

エラー: `Cannot read properties of undefined`

原因: drizzle-dbml-generatorがスキーマ構造を正しく解釈できていない

解決方法:

```bash
# スキーマファイルの構文を確認
pnpm tsc --noEmit

# drizzle-kitの型チェック
pnpm db:generate
```

### dbdocs認証エラー

エラー: `Unauthorized` や `Authentication failed`

原因: `DBDOCS_TOKEN` が設定されていない、または期限切れ

解決方法:

```bash
# ローカルで再認証
pnpm dbdocs login

# 新しいトークンを取得
pnpm dbdocs token -g

# GitHub Secretsに設定
gh secret set DBDOCS_TOKEN -b"<token>"
```

### GitHub Actions デプロイ失敗

エラー: `pnpm db:docs:push` が失敗する

原因: `DBDOCS_TOKEN` が GitHub Secrets に設定されていない

解決方法:

1. ローカルで `pnpm dbdocs token -g` を実行
2. 出力されたトークンを GitHub Secrets に設定:
   - リポジトリの Settings → Secrets and variables → Actions
   - 「New repository secret」をクリック
   - Name: `DBDOCS_TOKEN`
   - Value: `<generated-token>`

## ベストプラクティス

### 1. スキーマ変更時のワークフロー

```bash
# 1. スキーマを編集
vim src/db/schema.ts

# 2. マイグレーションを生成
pnpm db:generate

# 3. DBMLを生成して確認
pnpm db:docs:generate

# 4. コミット（GitHub Actionsが自動デプロイ）
git add src/db/schema.ts docs/database/schema.dbml
git commit -m "feat: add new column to users table"
git push
```

### 2. ドキュメントファーストアプローチ

大きなスキーマ変更を行う前に、DBMLを先に確認してレビューを受ける:

```bash
# ローカルでDBMLを生成
pnpm db:docs:generate

# PRを作成してレビュー依頼
gh pr create --title "schema: add user preferences table"
```

### 3. 定期的な同期確認

スキーマとDBMLが同期しているか定期的に確認:

```bash
# DBMLを再生成
pnpm db:docs:generate

# 差分を確認（差分がなければ同期している）
git diff docs/database/schema.dbml
```

## 参考リンク

- [dbdocs 公式ドキュメント](https://docs.dbdocs.io/)
- [DBML 文法リファレンス](https://dbml.dbdiagram.io/docs/)
- [drizzle-docs-generator](https://github.com/rikeda71/drizzle-docs-generator)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team/)
