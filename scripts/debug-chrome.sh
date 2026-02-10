#!/usr/bin/env bash
# Chrome デバッグ起動スクリプト
# Usage: ./scripts/debug-chrome.sh [URL]

set -euo pipefail

# デフォルト URL
DEFAULT_URL="http://localhost:3000"
URL="${1:-$DEFAULT_URL}"

# Windows Chrome のパス
CHROME_WIN="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
CHROME_WIN_X86="/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"

# Chrome の検出
if [ -f "$CHROME_WIN" ]; then
  CHROME="$CHROME_WIN"
elif [ -f "$CHROME_WIN_X86" ]; then
  CHROME="$CHROME_WIN_X86"
else
  echo "❌ Chrome が見つかりません"
  exit 1
fi

# WSL2 の IP アドレスを取得
WSL_IP=$(ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)

# デバッグモードで起動
echo "🚀 Chrome をデバッグモードで起動します..."
echo "📍 URL: $URL"
echo "🌐 WSL2 IP: $WSL_IP"
echo ""
echo "📝 DevTools のショートカット:"
echo "  - F12: DevTools を開く"
echo "  - Ctrl+Shift+I: DevTools を開く"
echo "  - Ctrl+Shift+J: Console タブを開く"
echo "  - Ctrl+Shift+C: 要素選択モード"
echo ""

# リモートデバッグポートを有効にして起動
"$CHROME" \
  --remote-debugging-port=9222 \
  --remote-debugging-address=0.0.0.0 \
  --user-data-dir="$HOME/.chrome-debug-profile" \
  --disable-web-security \
  --disable-features=IsolateOrigins,site-per-process \
  "$URL" &

CHROME_PID=$!

echo "✅ Chrome (PID: $CHROME_PID) を起動しました"
echo "🔍 リモートデバッグ:"
echo "   - localhost: http://localhost:9222"
echo "   - WSL2:      http://$WSL_IP:9222"
echo ""
echo "💡 ヒント:"
echo "  - Cloudflare ログ監視: pnpm cf:logs"
echo "  - ローカル開発サーバー: pnpm env:run -- pnpm dev"
echo ""
echo "📋 MCP サーバー更新コマンド:"
echo "   claude mcp add --transport stdio chrome-devtools -- \\"
echo "     npx -y chrome-devtools-mcp@latest --browserUrl http://$WSL_IP:9222"
echo ""
echo "終了するには Ctrl+C を押してください"

# Ctrl+C でプロセスをクリーンアップ
trap "echo ''; echo '🛑 Chrome を終了しています...'; kill $CHROME_PID 2>/dev/null || true" EXIT INT TERM

# プロセスが終了するまで待機
wait $CHROME_PID 2>/dev/null || true
