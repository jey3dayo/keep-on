# Troubleshooting

## Cloudflare Workers デプロイエラー

エラー: 環境変数が見つからない。

### 解決方法

`pnpm cf:secret list` で不足を確認し、`.claude/rules/cloudflare-deployment.md` の「Secrets登録方法」の手順で登録する。

## dotenvx 復号エラー

エラー: `DOTENV_PRIVATE_KEY` が見つからない。

### 解決方法

```bash
# 環境変数として設定
export DOTENV_PRIVATE_KEY="秘密鍵"

# または .env.keys ファイルから読み込み
DOTENV_PRIVATE_KEY=$(grep '^DOTENV_PRIVATE_KEY=' .env.keys | cut -d= -f2-) dotenvx run -- pnpm dev
```

## 認証のリダイレクトループ（headless でのみ再現）

（歴史的記述: Clerk は 2026-08 に Cloudflare Access へ移行済み。以下は移行前に Clerk のハンドシェイクで観測されていた事象）

症状: 認証のハンドシェイクに関するリダイレクトループが `wrangler tail` に出るが、通常のブラウザでは問題なく遷移できる。

原因: headless ブラウザ（未ログイン/セッションなし）で `/dashboard` に直接アクセスすると、
認証のハンドシェイクが失敗してループすることがある。実ブラウザで有効なセッションがある場合は発生しない。

### 確認手順

```bash
dotenvx run -- wrangler tail --format pretty
```

1. 実ブラウザで `/dashboard` をリロード（遅延が出る操作と同じ）
2. `requestId` や `cf-ray` を含むログを確認

### 対処

- headless でのループは無視して OK（実ブラウザで問題がなければ設定不整合ではない可能性が高い）
- 遅延調査は **実ブラウザ**で再現しながら `wrangler tail` でログ収集する
