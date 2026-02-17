#!/usr/bin/env bash
# MCP Chrome DevTools サーバーの接続先を現在の WSL2 IP に更新

set -euo pipefail

# 共通ライブラリを読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# WSL2 の IP アドレスを取得
WSL_IP=$(ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)

if [ -z "$WSL_IP" ]; then
  echo "❌ WSL2 の IP アドレスを取得できませんでした"
  exit 1
fi

echo "🌐 現在の WSL2 IP: $WSL_IP"
echo ""
echo "🔄 MCP Chrome DevTools サーバーを更新します..."
echo ""

# MCP サーバーを更新
claude mcp add \
  --transport stdio \
  chrome-devtools \
  -- \
  npx -y chrome-devtools-mcp@latest \
  --browserUrl "http://$WSL_IP:9222"

echo ""
echo "✅ 更新完了"
echo ""
echo "📝 次のステップ:"
echo "  1. Chrome を起動: ./scripts/debug-chrome.sh"
echo "  2. Claude Code を再起動"
echo "  3. MCP ツールが使用可能になります"
