# Cloudflare Workers デプロイガイド

## Infrastructure as Code による環境変数管理

このプロジェクトでは、Cloudflare Workers の環境変数を Infrastructure as Code で管理しています。

### 環境変数の分類

#### 1. 公開変数（Git コミット可）

`wrangler.jsonc` の `vars` セクションに記載：

```jsonc
{
  "vars": {
    "NEXTJS_ENV": "production",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "...",
    "NEXT_PUBLIC_CLERK_SIGN_IN_URL": "/sign-in",
    "NEXT_PUBLIC_CLERK_SIGN_UP_URL": "/sign-up",
  },
}
```

**特徴:**

- Git にコミット可能
- ブラウザに露出しても問題ない値
- `NEXT_PUBLIC_*` など

#### 2. シークレット（Git コミット不可）

`wrangler secret` コマンドで Cloudflare に保存：

```bash
echo '<value>' | pnpm wrangler secret put DATABASE_URL
echo '<value>' | pnpm wrangler secret put CLERK_SECRET_KEY
```

**特徴:**

- Cloudflare にのみ保存
- Git には含まれない
- API キー、DB 接続文字列など

---

## デプロイ手順

### 初回デプロイ

#### 1. workers.dev サブドメイン登録

https://dash.cloudflare.com/<ACCOUNT_ID>/workers/onboarding

#### 2. KV Namespace 作成（済み）

```bash
pnpm wrangler kv namespace create NEXT_INC_CACHE_KV
# → ID を wrangler.jsonc に設定済み
```

#### 3. シークレット設定

```bash
# Cloudflare API トークンと Account ID を環境変数に設定
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# DATABASE_URL を設定
echo 'postgresql://...' | pnpm wrangler secret put DATABASE_URL

# CLERK_SECRET_KEY を設定
echo 'sk_test_...' | pnpm wrangler secret put CLERK_SECRET_KEY
```

#### 4. デプロイ実行

```bash
# ビルド
pnpm build:cf

# デプロイ
mise run deploy
# または
pnpm env:run -- pnpm wrangler deploy
```

---

### 継続的デプロイ

2回目以降は以下のコマンドのみ：

```bash
pnpm build:cf
mise run deploy
```

---

## トラブルシューティング

### 環境変数が反映されない

Cloudflare Dashboard で確認：

#### Workers & Pages → keep-on → Settings → Variables

- Environment Variables: 公開変数
- Secrets: シークレット（値は非表示）

### シークレットを更新したい

```bash
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."

echo '<new-value>' | pnpm wrangler secret put <SECRET_NAME>
```

### シークレット一覧を確認

```bash
pnpm wrangler secret list
```

---

## CI/CD への統合

### GitHub Actions 自動デプロイ

`.github/workflows/deploy.yml` で自動デプロイが設定済み：

- **トリガー**: `main` ブランチへのプッシュ
- **ワークフロー**: ビルド → デプロイ

#### 必要な GitHub Secrets

GitHub リポジトリの Settings → Secrets and variables → Actions で設定：

| Secret名                | 説明                    | 取得方法                                                     |
| ----------------------- | ----------------------- | ------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API トークン | [API Tokens](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウントID | Dashboard 右サイドバー                                       |
| `DOTENV_PRIVATE_KEY`    | dotenvx 秘密鍵          | `.env.keys` ファイル                                         |

#### ワークフロー有効化

```bash
# GitHub Secrets を設定後、main にプッシュで自動デプロイ
git push origin main
```

---

## Secrets登録方法

### バルク登録（推奨）

`wrangler secret bulk` を使った一括登録：

```bash
# バルク登録スクリプトを実行
./scripts/setup-cloudflare-secrets-bulk.sh
```

**仕組み:**

1. `.env` から環境変数を読み込み
2. `.secrets.json` を生成（一時ファイル、自動削除）
3. `wrangler secret bulk` で一括登録

**必要な環境変数:**

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DOTENV_PRIVATE_KEY`（dotenvx復号用）

**登録されるSecrets:**

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `SENTRY_DSN`（設定されている場合）

### 個別登録

個別に設定する場合（既存スクリプト）：

```bash
./scripts/setup-cloudflare-secrets.sh
```

### GitHub Actions での自動同期

`.github/workflows/sync-secrets.yml` で手動トリガー可能：

1. GitHub リポジトリの **Actions** タブを開く
2. **Sync Secrets to Cloudflare** ワークフローを選択
3. **Run workflow** をクリック

**注意事項:**

- 既存のSecretsを上書きします
- GitHub Secrets（`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DOTENV_PRIVATE_KEY`）が必要

---

## PRプレビュー機能

GitHub PR作成時に、自動的にプレビュー環境をデプロイします。

### 自動デプロイ

`.github/workflows/preview.yml` が以下を実行：

1. **PR作成・更新時**: 自動ビルド＆デプロイ
2. **固定URL**: `https://keep-on-pr-{PR番号}.j138cm.workers.dev`
3. **PRコメント**: デプロイURLを自動投稿
4. **PRクローズ時**: プレビュー環境を自動削除

### プレビューURL例

| PR番号 | プレビューURL                               |
| ------ | ------------------------------------------- |
| #123   | `https://keep-on-pr-123.j138cm.workers.dev` |
| #456   | `https://keep-on-pr-456.j138cm.workers.dev` |

### 注意事項

⚠️ **プレビュー環境は本番と同じデータベースを共有します**

- データ操作のテストは慎重に行ってください
- 本番データを破壊しないように注意してください
- テスト用ユーザーを使用してください（詳細は `.claude/rules/testing.md`）

### 手動プレビューデプロイ

ローカルからプレビューをデプロイ：

```bash
# PR番号を指定してデプロイ
pnpm wrangler deploy --name "keep-on-pr-123" --env preview

# プレビューを削除
pnpm wrangler delete --name "keep-on-pr-123" --force
```

---

## バンドルサイズ監視

Cloudflare Workers のバンドルサイズ制限（25MB gzipped）を超えないように、CI で自動監視しています。

### 自動チェック

`.github/workflows/bundle-size.yml` で以下を実行：

1. **PR作成時**: バンドルサイズをチェックしてコメント
2. **main ブランチ**: サイズ履歴を記録（`.bundle-history/history.txt`）

### 警告・エラー基準

| 状態      | サイズ            | 動作              |
| --------- | ----------------- | ----------------- |
| ✅ 正常   | < 20MB (80%)      | CI 成功           |
| ⚠️ 警告   | 20-25MB (80-100%) | CI 成功、警告表示 |
| ❌ エラー | > 25MB (100%)     | CI 失敗           |

### 手動確認

ローカルでバンドルサイズを確認：

```bash
# ビルド実行
pnpm build:cf

# Dry-run でサイズ確認
pnpm wrangler deploy --dry-run
```

出力例：

```
Total Upload: 12.34 MB / gzip: 4.56 MB
```

### サイズ削減方法

バンドルサイズが大きい場合の対処法：

1. **未使用依存の削除**: `pnpm dlx depcheck` で検出
2. **Dynamic Import**: 大きなライブラリを遅延ロード
3. **Tree Shaking**: 未使用エクスポートを削除
4. **WASM 除外**: 不要な WASM ファイルを Webpack で除外

---

## セキュリティベストプラクティス

### ✅ 推奨

- シークレットは `wrangler secret` コマンドで設定
- 公開変数のみ `wrangler.jsonc` に記載
- `.env` は dotenvx で暗号化してコミット
- API トークンは定期的にローテーション

### ❌ 非推奨

- Cloudflare Dashboard での手動設定（IaC ではない）
- `.env` にシークレットを平文で保存
- `wrangler.jsonc` にシークレットを記載
- API トークンをハードコード

---

## 参考リンク

- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Wrangler CLI リファレンス](https://developers.cloudflare.com/workers/wrangler/)
- [dotenvx 暗号化](https://dotenvx.com/encryption)
