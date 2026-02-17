#!/usr/bin/env bash
# Cloudflare Workers Secrets セットアップスクリプト
#
# 使い方:
#   ./scripts/setup-cloudflare-secrets.sh
#
# 必要な環境変数:
#   CLOUDFLARE_API_TOKEN
#   CLOUDFLARE_ACCOUNT_ID
#   CLERK_SECRET_KEY

set -euo pipefail

# 共通ライブラリを読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# Secrets設定
set_secret() {
  local secret_name=$1
  local secret_value=$2

  echo "Setting secret: $secret_name"

  if echo "$secret_value" | pnpm wrangler secret put "$secret_name" --quiet 2>/dev/null; then
    success "Secret '$secret_name' を設定しました"
  else
    error "Secret '$secret_name' の設定に失敗しました"
  fi
}

echo "========================================="
echo "Cloudflare Workers Secrets セットアップ"
echo "========================================="
echo ""

# 必須環境変数の確認
check_env "CLOUDFLARE_API_TOKEN"
check_env "CLOUDFLARE_ACCOUNT_ID"

# dotenvx で .env を読み込んで実行
if command -v dotenvx &> /dev/null; then
  warn "dotenvx で .env を読み込みます..."

  # .env から環境変数を読み込む
  eval "$(dotenvx run -- env | grep -E '^(CLERK_SECRET_KEY)=')"
fi

# Secrets設定
check_env "CLERK_SECRET_KEY"

set_secret "CLERK_SECRET_KEY" "$CLERK_SECRET_KEY"

echo ""
success "全てのSecretsを設定しました！"
echo ""
echo "確認コマンド:"
echo "  pnpm wrangler secret list"
