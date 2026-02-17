#!/usr/bin/env bash
# Cloudflare Workers メトリクス取得スクリプト
#
# 使い方:
#   ./scripts/get-workers-metrics.sh [period]
#
# 引数:
#   period: 集計期間（デフォルト: 1h）
#           - 1h: 直近1時間
#           - 6h: 直近6時間
#           - 24h: 直近24時間
#           - 7d: 直近7日
#
# 必要な環境変数:
#   CLOUDFLARE_API_TOKEN (Analytics Read 権限)
#   CLOUDFLARE_ACCOUNT_ID

set -euo pipefail

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 関数: 情報メッセージ
info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# 環境変数チェック
check_env() {
  local var_name=$1
  if [[ -z "${!var_name:-}" ]]; then
    error "環境変数 $var_name が設定されていません"
  fi
}

# 必須環境変数の確認
check_env "CLOUDFLARE_API_TOKEN"
check_env "CLOUDFLARE_ACCOUNT_ID"

# 集計期間
PERIOD="${1:-1h}"
WORKER_NAME="keep-on"

echo "========================================="
echo "Cloudflare Workers メトリクス取得"
echo "========================================="
echo ""
info "Worker: ${WORKER_NAME}"
info "期間: ${PERIOD}"
echo ""

# GraphQL クエリ
QUERY=$(cat <<EOF
{
  "query": "query { viewer { accounts(filter: { accountTag: \\"${CLOUDFLARE_ACCOUNT_ID}\\" }) { workersInvocationsAdaptive(filter: { scriptName: \\"${WORKER_NAME}\\" } limit: 100 orderBy: [datetime_DESC]) { dimensions { datetime } sum { requests errors } avg { cpuTime duration } quantiles { cpuTimeP50 cpuTimeP99 durationP50 durationP99 } } } } }"
}
EOF
)

# API リクエスト
RESPONSE=$(curl -s -X POST https://api.cloudflare.com/client/v4/graphql \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$QUERY")

# エラーチェック
if echo "$RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
  error "API エラー: $(echo "$RESPONSE" | jq -r '.errors[0].message')"
fi

# 結果を整形して表示
echo "📊 メトリクス:"
echo ""

# リクエスト数とエラー数
TOTAL_REQUESTS=$(echo "$RESPONSE" | jq -r '.data.viewer.accounts[0].workersInvocationsAdaptive[0].sum.requests // 0')
TOTAL_ERRORS=$(echo "$RESPONSE" | jq -r '.data.viewer.accounts[0].workersInvocationsAdaptive[0].sum.errors // 0')

if [[ "$TOTAL_REQUESTS" != "null" && "$TOTAL_REQUESTS" != "0" ]]; then
  ERROR_RATE=$(echo "scale=2; $TOTAL_ERRORS * 100 / $TOTAL_REQUESTS" | bc)
else
  ERROR_RATE="0"
fi

echo "リクエスト:"
echo "  総数: ${TOTAL_REQUESTS}"
echo "  エラー: ${TOTAL_ERRORS}"
echo "  エラー率: ${ERROR_RATE}%"
echo ""

# CPU Time
CPU_AVG=$(echo "$RESPONSE" | jq -r '.data.viewer.accounts[0].workersInvocationsAdaptive[0].avg.cpuTime // 0')
CPU_P50=$(echo "$RESPONSE" | jq -r '.data.viewer.accounts[0].workersInvocationsAdaptive[0].quantiles.cpuTimeP50 // 0')
CPU_P99=$(echo "$RESPONSE" | jq -r '.data.viewer.accounts[0].workersInvocationsAdaptive[0].quantiles.cpuTimeP99 // 0')

echo "CPU Time (ms):"
echo "  平均: ${CPU_AVG}"
echo "  P50: ${CPU_P50}"
echo "  P99: ${CPU_P99}"

# P99が警告閾値を超えているか
if (( $(echo "$CPU_P99 > 50" | bc -l) )); then
  echo -e "  ${RED}⚠ 警告: P99 CPU Time が 50ms を超えています${NC}"
fi
echo ""

# Duration
DURATION_AVG=$(echo "$RESPONSE" | jq -r '.data.viewer.accounts[0].workersInvocationsAdaptive[0].avg.duration // 0')
DURATION_P50=$(echo "$RESPONSE" | jq -r '.data.viewer.accounts[0].workersInvocationsAdaptive[0].quantiles.durationP50 // 0')
DURATION_P99=$(echo "$RESPONSE" | jq -r '.data.viewer.accounts[0].workersInvocationsAdaptive[0].quantiles.durationP99 // 0')

echo "Duration (ms):"
echo "  平均: ${DURATION_AVG}"
echo "  P50: ${DURATION_P50}"
echo "  P99: ${DURATION_P99}"

# P99が警告閾値を超えているか
if (( $(echo "$DURATION_P99 > 500" | bc -l) )); then
  echo -e "  ${RED}⚠ 警告: P99 Duration が 500ms を超えています${NC}"
fi
echo ""

success "メトリクス取得完了"
echo ""
echo "詳細: https://dash.cloudflare.com/ → Workers & Pages → ${WORKER_NAME} → Metrics"
