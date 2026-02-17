#!/usr/bin/env bash
# Cloudflare Secrets を JSON 形式で生成
#
# 使い方:
#   ./scripts/generate-secrets-json.sh
#
# 出力:
#   .secrets.json（機密情報を含むため .gitignore に追加済み）

set -euo pipefail

# 共通ライブラリを読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

echo "========================================="
echo "Cloudflare Secrets JSON 生成"
echo "========================================="
echo ""

# dotenvx で .env を読み込んで実行
if command -v dotenvx &> /dev/null; then
  echo "dotenvx で .env を読み込みます..."
  eval "$(dotenvx run -- env | grep -E '^(CLERK_SECRET_KEY|SENTRY_DSN)=')"
else
  error "dotenvx がインストールされていません"
fi

# 必須環境変数の確認
check_env "CLERK_SECRET_KEY"

# SENTRY_DSN はオプション
SENTRY_DSN="${SENTRY_DSN:-}"

# JSON 生成
cat > .secrets.json <<EOF
{
  "CLERK_SECRET_KEY": "${CLERK_SECRET_KEY}"$(if [[ -n "$SENTRY_DSN" ]]; then echo ",
  \"SENTRY_DSN\": \"${SENTRY_DSN}\""; fi)
}
EOF

success "Secrets JSON を生成しました: .secrets.json"
echo ""
echo "⚠️  注意: .secrets.json には機密情報が含まれています"
echo "   - このファイルは .gitignore に追加されています"
echo "   - 使用後は必ず削除してください"
