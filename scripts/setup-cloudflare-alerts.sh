#!/usr/bin/env bash
# Cloudflare アラート設定スクリプト
#
# 使い方:
#   ./scripts/setup-cloudflare-alerts.sh
#
# 必要な環境変数:
#   CLOUDFLARE_API_TOKEN
#   CLOUDFLARE_ACCOUNT_ID
#   CLOUDFLARE_NOTIFICATION_EMAIL (オプション: アラート送信先)

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

echo "========================================="
echo "Cloudflare アラート設定"
echo "========================================="
echo ""

# 必須環境変数の確認
check_env "CLOUDFLARE_API_TOKEN"
check_env "CLOUDFLARE_ACCOUNT_ID"

# 通知先メールアドレス（デフォルト: 環境変数から取得）
NOTIFICATION_EMAIL="${CLOUDFLARE_NOTIFICATION_EMAIL:-}"

if [[ -z "$NOTIFICATION_EMAIL" ]]; then
  warn "CLOUDFLARE_NOTIFICATION_EMAIL が設定されていません"
  echo "アラート通知先のメールアドレスを入力してください:"
  read -r NOTIFICATION_EMAIL
fi

echo ""
echo "📋 設定内容:"
echo "  Account ID: ${CLOUDFLARE_ACCOUNT_ID}"
echo "  通知先: ${NOTIFICATION_EMAIL}"
echo ""

# アラート設定の例（実際のAPI呼び出しはCloudflare Dashboard推奨）
cat <<EOF
以下のアラートをCloudflare Dashboardで設定してください：

1. CPU Time 超過アラート
   - 条件: P99 CPU Time > 50ms
   - 期間: 5分間継続
   - 通知先: ${NOTIFICATION_EMAIL}

2. エラー率アラート
   - 条件: Error Rate > 5%
   - 期間: 1分間継続
   - 通知先: ${NOTIFICATION_EMAIL}

3. レスポンスタイムアラート
   - 条件: P99 Duration > 500ms
   - 期間: 5分間継続
   - 通知先: ${NOTIFICATION_EMAIL}

設定手順:
1. https://dash.cloudflare.com/ にアクセス
2. Notifications → Create をクリック
3. Workers カテゴリを選択
4. 上記の条件を設定
5. 通知先を追加
6. Save をクリック

詳細: .claude/rules/cloudflare-analytics.md を参照
EOF

echo ""
success "アラート設定ガイドを表示しました"
echo ""
echo "📚 詳細ドキュメント: .claude/rules/cloudflare-analytics.md"
