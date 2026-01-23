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
    "NEXT_PUBLIC_CLERK_SIGN_UP_URL": "/sign-up"
  }
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

**Workers & Pages → keep-on → Settings → Variables**

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

GitHub Actions での自動デプロイ例：

```yaml
- name: Deploy to Cloudflare
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  run: |
    pnpm build:cf
    pnpm wrangler deploy
```

**必要な GitHub Secrets:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DOTENV_PRIVATE_KEY` (dotenvx 用)

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
