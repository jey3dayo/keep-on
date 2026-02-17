#!/usr/bin/env bash
# Cloudflare Workers Secrets バルク登録スクリプト
#
# 使い方:
#   ./scripts/setup-cloudflare-secrets-bulk.sh
#
# 必要な環境変数:
#   CLOUDFLARE_API_TOKEN
#   CLOUDFLARE_ACCOUNT_ID

set -euo pipefail

# 共通ライブラリを読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# クリーンアップ（終了時に実行）
cleanup() {
  if [[ -f .secrets.json ]]; then
    rm -f .secrets.json
    success ".secrets.json を削除しました"
  fi
}

register_cleanup cleanup

echo "========================================="
echo "Cloudflare Workers Secrets バルク登録"
echo "========================================="
echo ""

# 必須環境変数の確認
check_env "CLOUDFLARE_API_TOKEN"
check_env "CLOUDFLARE_ACCOUNT_ID"

# JSON ファイルを生成
if [[ ! -f ./scripts/generate-secrets-json.sh ]]; then
  error "generate-secrets-json.sh が見つかりません"
fi

echo "1. Secrets JSON を生成中..."
./scripts/generate-secrets-json.sh

if [[ ! -f .secrets.json ]]; then
  error ".secrets.json の生成に失敗しました"
fi

echo ""
echo "2. Secrets をバルク登録中..."

# wrangler secret bulk を使用
if pnpm wrangler secret bulk .secrets.json; then
  success "全ての Secrets を登録しました！"
else
  error "Secrets の登録に失敗しました"
fi

echo ""
echo "確認コマンド:"
echo "  pnpm wrangler secret list"
