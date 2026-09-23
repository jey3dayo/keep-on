---
paths:
  - "wrangler.jsonc"
  - ".github/workflows/**"
  - "package.json"
---

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
