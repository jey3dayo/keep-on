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

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 関数: エラーメッセージ
error() {
  echo -e "${RED}✘ Error: $1${NC}" >&2
  exit 1
}

# 関数: 成功メッセージ
success() {
  echo -e "${GREEN}✔ $1${NC}"
}

# 関数: 警告メッセージ
warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# 環境変数チェック
check_env() {
  local var_name=$1
  if [[ -z "${!var_name:-}" ]]; then
    error "環境変数 $var_name が設定されていません"
  fi
}

# クリーンアップ（終了時に実行）
cleanup() {
  if [[ -f .secrets.json ]]; then
    rm -f .secrets.json
    echo "✔ .secrets.json を削除しました"
  fi
}

trap cleanup EXIT

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
