---
paths:
  - ".env*"
  - "wrangler.jsonc"
  - ".github/workflows/**/*.yml"
  - "scripts/**/*.{sh,mjs,ts}"
  - "mise.toml"
---

# AI コマンド実行ルール: dotenvx

## 必須ルール

環境変数（`CLOUDFLARE_API_TOKEN`, `CLERK_SECRET_KEY` 等）が必要なコマンドは、**必ず** `pnpm env:run --` または `dotenvx run --` 経由で実行すること。

## 禁止事項

- シークレット値をコマンド引数に直接記述すること
- インライン環境変数（`FOO=bar command`）でシークレットを渡すこと
- `dotenvx run --` を経由せずに `wrangler deploy` / `wrangler tail` / `wrangler secret` を直接実行すること

## 正しいコマンド例

package.json に定義済みのスクリプトを優先して使用する:

```bash
# デプロイ（ビルド込み）
pnpm deploy

# デプロイのみ
pnpm cf:deploy

# Workers ログ監視
pnpm cf:logs

# Secrets 操作
pnpm cf:secret list
pnpm cf:secret put KEY_NAME
```

直接 dotenvx 経由で実行する場合:

```bash
pnpm env:run -- wrangler deploy
pnpm env:run -- wrangler tail --format pretty
pnpm env:run -- wrangler secret list
```

## 誤りパターンと正しい代替

| ❌ 誤り                                    | ✅ 正しい代替                                             |
| ------------------------------------------ | --------------------------------------------------------- |
| `wrangler deploy`                          | `pnpm cf:deploy`                                          |
| `wrangler tail`                            | `pnpm cf:logs`                                            |
| `wrangler secret list`                     | `pnpm cf:secret list`                                     |
| `CLOUDFLARE_API_TOKEN=xxx wrangler deploy` | `pnpm env:run -- wrangler deploy`                         |
| `echo 'sk_...' \| wrangler secret put KEY` | `pnpm env:run -- wrangler secret put KEY`（値は対話入力） |

## 参考

詳細な環境変数管理の説明は `.claude/rules/dotenvx.md` を参照。
