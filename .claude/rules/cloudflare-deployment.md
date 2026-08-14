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
    "ACCESS_TEAM_DOMAIN": "jey3dayo.cloudflareaccess.com",
    "ACCESS_AUD": "...",
  },
}
```

##### 特徴

- Git にコミット可能
- ブラウザに露出しても問題ない値
- `NEXT_PUBLIC_*` など

#### 2. シークレット（Git コミット不可）

`wrangler secret` コマンドで Cloudflare に保存：

```bash
# 値はプロンプトへ対話入力する（コマンド引数に書くとシェル履歴に残る）
pnpm cf:secret put SENTRY_DSN
```

##### 特徴

- Cloudflare にのみ保存
- Git には含まれない
- API キー、DB 接続文字列など

### `env` セクションのバインディング継承に関する注意

Wrangler の `env` セクションでは、`vars`・`kv_namespaces`・`d1_databases` 等のバインディングは **non-inheritable（継承不可）** です。トップレベルに定義していても `env.*` には自動で引き継がれないため、各環境で明示的に定義する必要があります。

```jsonc
{
  "kv_namespaces": [{ "binding": "NEXT_INC_CACHE_KV", "id": "..." }],
  "d1_databases": [
    { "binding": "DB", "database_name": "...", "database_id": "..." },
  ],
  "env": {
    "preview": {
      // vars, kv_namespaces, d1_databases をすべて明示的に定義すること
      "vars": { "NEXTJS_ENV": "preview" },
      "kv_namespaces": [{ "binding": "NEXT_INC_CACHE_KV", "id": "..." }],
      "d1_databases": [
        { "binding": "DB", "database_name": "...", "database_id": "..." },
      ],
    },
  },
}
```

バインディングを省略すると、ワーカー内の `env.DB` や `env.NEXT_INC_CACHE_KV` が `undefined` になり Internal Server Error が発生します。

参考: [Wrangler Environments - Non-inheritable Keys](https://developers.cloudflare.com/workers/wrangler/environments)

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

# SENTRY_DSN を設定（値はプロンプトへ対話入力する）
pnpm cf:secret put SENTRY_DSN
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

- トリガー: `main` ブランチへのプッシュ
- ワークフロー: ビルド → デプロイ

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

`wrangler secret put` で個別登録する（一時 JSON は使わない）：

```bash
# 値はプロンプトへ対話入力する（コマンド引数に書くとシェル履歴に残る）
pnpm cf:secret put SENTRY_DSN
```

詳細は `.claude/rules/sentry.md` を参照。

---

## PRプレビュー機能

GitHub PR作成時に、自動的にプレビュー環境をデプロイします。

### 自動デプロイ

`.github/workflows/preview.yml` が以下を実行：

1. PR作成・更新時: 自動ビルド＆デプロイ
2. 固定URL: `https://keep-on-pr-{PR番号}.j138cm.workers.dev`
3. PRコメント: デプロイURLを自動投稿
4. PRクローズ時: プレビュー環境を自動削除

### プレビューURL例

| PR番号 | プレビューURL                               |
| ------ | ------------------------------------------- |
| #123   | `https://keep-on-pr-123.j138cm.workers.dev` |
| #456   | `https://keep-on-pr-456.j138cm.workers.dev` |

### 注意事項

ℹ️ **プレビュー環境は本番と分離された専用データベース（`keep-on-db-preview`）を使用します**

- `wrangler.jsonc` の `env.preview.d1_databases` で本番（`keep-on-db`）とは別の database_id を指定しており、スキーマ乖離やデータ破壊が本番へ波及しない
- `.github/workflows/preview.yml` がデプロイ直前に `wrangler d1 migrations apply keep-on-db-preview --remote --env preview` を実行し、preview DB へ全マイグレーションを適用する
- それでもテストデータは preview 専用 DB 内に蓄積されるため、テスト用ユーザーを使用してください（詳細は `.claude/rules/testing.md`）

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

1. PR作成時: バンドルサイズをチェックしてコメント
2. main ブランチ: サイズ履歴を記録（`.bundle-history/history.txt`）

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

```text
Total Upload: 12.34 MB / gzip: 4.56 MB
```

### サイズ削減方法

バンドルサイズが大きい場合の対処法：

1. 未使用依存の削除: `pnpm dlx depcheck` で検出
2. Dynamic Import: 大きなライブラリを遅延ロード
3. Tree Shaking: 未使用エクスポートを削除
4. WASM 除外: 不要な WASM ファイルを Webpack で除外

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
