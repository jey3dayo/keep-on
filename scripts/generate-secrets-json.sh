#!/usr/bin/env bash
# Cloudflare Secrets を JSON 形式で生成
#
# 使い方:
#   ./scripts/generate-secrets-json.sh
#
# 出力:
#   .secrets.json（機密情報を含むため .gitignore に追加済み）

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

# 環境変数チェック
check_env() {
  local var_name=$1
  if [[ -z "${!var_name:-}" ]]; then
    error "環境変数 $var_name が設定されていません"
  fi
}

echo "========================================="
echo "Cloudflare Secrets JSON 生成"
echo "========================================="
echo ""

# dotenvx で .env を読み込んで実行
if command -v dotenvx &> /dev/null; then
  echo "dotenvx で .env を読み込みます..."
  eval "$(dotenvx run -- env | grep -E '^(DATABASE_URL|CLERK_SECRET_KEY|SENTRY_DSN)=')"
else
  error "dotenvx がインストールされていません"
fi

# 必須環境変数の確認
check_env "DATABASE_URL"
check_env "CLERK_SECRET_KEY"

# SENTRY_DSN はオプション
SENTRY_DSN="${SENTRY_DSN:-}"

# JSON 生成
cat > .secrets.json <<EOF
{
  "DATABASE_URL": "${DATABASE_URL}",
  "CLERK_SECRET_KEY": "${CLERK_SECRET_KEY}"$(if [[ -n "$SENTRY_DSN" ]]; then echo ",
  \"SENTRY_DSN\": \"${SENTRY_DSN}\""; fi)
}
EOF

success "Secrets JSON を生成しました: .secrets.json"
echo ""
echo "⚠️  注意: .secrets.json には機密情報が含まれています"
echo "   - このファイルは .gitignore に追加されています"
echo "   - 使用後は必ず削除してください"
