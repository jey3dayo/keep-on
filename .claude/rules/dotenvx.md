---
paths:
  - ".env*"
  - "wrangler.jsonc"
  - ".github/workflows/**/*.yml"
  - "package.json"
---

# dotenvx 暗号化管理ガイド

## 概要

dotenvx は環境変数を暗号化してリポジトリに安全にコミットできるツールです。
このプロジェクトでは、機密情報を含む環境変数を暗号化管理しています。

## 仕組み

- `.env` - 暗号化された本番用環境変数（コミット対象）
- `.env.development` - 暗号化された開発用環境変数（コミット対象）
- `.env.keys` - 秘密鍵（**絶対にコミットしない** - `.gitignore` 済み）
- `DOTENV_PRIVATE_KEY` - `.env` の復号キー
- `DOTENV_PRIVATE_KEY_DEVELOPMENT` - `.env.development` の復号キー

## マルチ環境の仕組み

開発系スクリプトには `dotenvx run --overload -f .env -f .env.development` を使用:

| 読み込み順                        | 優先度                          |
| --------------------------------- | ------------------------------- |
| 1. `.env`（本番キー）             | 低（後から上書きされる）        |
| 2. `.env.development`（開発キー） | 高（`--overload` で上書き優先） |

`.env.development` が後に読み込まれるため、開発時は `pk_test_...` / `sk_test_...` が有効になる。

### 適用スクリプト（開発系）

- `pnpm dev`, `pnpm start`
- `pnpm test`, `pnpm test:run` など全テスト系
- `pnpm db:studio`
- `pnpm env:run`

### 適用されないスクリプト（本番用）

- `pnpm build:cf` - `dotenvx run --overload --` で `.env` のみ使用
- `pnpm cf:deploy`, `pnpm cf:logs` などの Cloudflare 系スクリプト

## 初回セットアップ（新規開発者向け）

### 1. 秘密鍵の取得

チームリーダーから `DOTENV_PRIVATE_KEY` を取得してください。
値は `.env.keys` ファイル内の `DOTENV_PRIVATE_KEY` です。

### 2. 環境変数として設定

```bash
# シェル環境変数として設定
export DOTENV_PRIVATE_KEY="取得した秘密鍵"

# または .bashrc / .zshrc に追記（推奨）
echo 'export DOTENV_PRIVATE_KEY="取得した秘密鍵"' >> ~/.bashrc
source ~/.bashrc
```

### 3. 復号して実行

```bash
# 開発サーバー起動
pnpm env:run -- pnpm dev

# Prisma Client 生成
pnpm env:run -- pnpm db:generate

# データベースマイグレーション
pnpm env:run -- pnpm db:push
```

`pnpm env:run` は `dotenvx run` のエイリアスです。

## 環境変数の追加・変更

### 1. dotenvx でセット（推奨）

```bash
# 値を暗号化して .env に追加
dotenvx set KEY "value"

# 複数の値を一度に設定
dotenvx set API_KEY "secret" DB_URL "postgres://..."

# コミット
git add .env
git commit -m "chore: update environment variables"
```

### 2. 手動で編集

```bash
# 1. 既存の .env を復号化
dotenvx decrypt  # 一時的に平文化
vim .env  # 値を編集

# 2. 再暗号化
pnpm env:encrypt

# 3. コミット
git add .env
git commit -m "chore: update environment variables"
```

## CI/CD 設定

### GitHub Actions

GitHub Secrets に秘密鍵を設定してください。

1. リポジトリの Settings → Secrets and variables → Actions
2. New repository secret
3. 以下の2つを登録:

| Secret 名                        | 取得元                                          |
| -------------------------------- | ----------------------------------------------- |
| `DOTENV_PRIVATE_KEY`             | `.env.keys` の `DOTENV_PRIVATE_KEY`             |
| `DOTENV_PRIVATE_KEY_DEVELOPMENT` | `.env.keys` の `DOTENV_PRIVATE_KEY_DEVELOPMENT` |

ワークフロー内での使用例:

```yaml
- name: Run tests
  env:
    DOTENV_PRIVATE_KEY: ${{ secrets.DOTENV_PRIVATE_KEY }}
  run: pnpm env:run -- pnpm test
```

### Cloudflare Workers

Cloudflare デプロイ時は `wrangler.jsonc` で環境変数を設定します:

```jsonc
{
  "vars": {
    "NODE_ENV": "production",
  },
  // secrets は wrangler secret put で設定
}
```

機密情報は以下のコマンドで設定:

```bash
echo "secret_value" | npx wrangler secret put SECRET_KEY
```

## トラブルシューティング

### エラー: "invalid private key"

秘密鍵が正しく設定されていません。

```bash
# 環境変数を確認
echo $DOTENV_PRIVATE_KEY

# 再設定
export DOTENV_PRIVATE_KEY="正しい秘密鍵"
```

### エラー: "missing encryption key"

`.env` が暗号化されていません。

```bash
# 暗号化
pnpm env:encrypt
```

### .env.keys を紛失した場合

1. `.env` を平文に戻す（別の開発者から取得）
2. 再暗号化: `pnpm env:encrypt`
3. 新しい `.env.keys` が生成される
4. チーム全員に新しい `DOTENV_PRIVATE_KEY` を共有

## ベストプラクティス

### DO

- 秘密鍵は安全に共有（1Password、Bitwarden など）
- `.env` は暗号化してコミット
- CI/CD で秘密鍵を環境変数として設定
- `.env.keys` は `.gitignore` に追加

### DON'T

- `.env.keys` をコミットしない
- 秘密鍵を公開チャンネルで共有しない
- 平文の `.env` をコミットしない

## コマンドリファレンス

```bash
# 暗号化
pnpm env:encrypt              # .env を暗号化

# 復号して実行
pnpm env:run -- <command>     # dotenvx run のエイリアス

# 値のセット
dotenvx set KEY "value"       # 暗号化して追加

# 値の取得（デバッグ用）
dotenvx get KEY               # 復号して表示
```

## 参考資料

- [dotenvx 公式ドキュメント](https://dotenvx.com/docs)
- [dotenvx GitHub](https://github.com/dotenvx/dotenvx)
