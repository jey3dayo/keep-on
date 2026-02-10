#!/usr/bin/env bash
# デバッグセッション総合起動スクリプト
# ローカル開発サーバー + Chrome + Cloudflare ログ監視を並行起動

set -euo pipefail

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 環境選択
ENV="${1:-local}"

case "$ENV" in
  local)
    URL="http://localhost:3000"
    echo -e "${GREEN}🏠 ローカル開発環境でデバッグを開始します${NC}"
    ;;
  production)
    URL="https://keep-on.j138cm.workers.dev"
    echo -e "${GREEN}☁️  Cloudflare 本番環境でデバッグを開始します${NC}"
    ;;
  *)
    echo -e "${RED}❌ 不正な環境: $ENV${NC}"
    echo "Usage: $0 [local|production]"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  KeepOn デバッグセッション${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📍 URL: ${YELLOW}$URL${NC}"
echo ""

# tmux セッション名
SESSION="keepon-debug-$ENV"

# 既存セッションの確認
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo -e "${YELLOW}⚠️  既存のセッション '$SESSION' が見つかりました${NC}"
  read -p "終了して再作成しますか? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    tmux kill-session -t "$SESSION"
  else
    echo -e "${GREEN}既存のセッションにアタッチします${NC}"
    tmux attach-session -t "$SESSION"
    exit 0
  fi
fi

# tmux セッション作成
tmux new-session -d -s "$SESSION" -n "server"

if [ "$ENV" = "local" ]; then
  # ペイン1: ローカル開発サーバー
  tmux send-keys -t "$SESSION:server.0" "cd $PWD && pnpm env:run -- pnpm dev" C-m

  # ペイン2: Cloudflare ログ監視（ウィンドウ分割）
  tmux split-window -h -t "$SESSION:server"
  tmux send-keys -t "$SESSION:server.1" "cd $PWD && echo 'Cloudflare ログ監視は本番環境でのみ有効です' && sleep 3" C-m
else
  # Cloudflare 本番環境の場合はログ監視のみ
  tmux send-keys -t "$SESSION:server.0" "cd $PWD && pnpm cf:logs" C-m

  # ペイン2: プレースホルダー
  tmux split-window -h -t "$SESSION:server"
  tmux send-keys -t "$SESSION:server.1" "cd $PWD && echo '本番環境デバッグモード' && echo 'Cloudflare ログ監視中...' && sleep infinity" C-m
fi

# ペイン3: Chrome 起動（新しいウィンドウ）
tmux new-window -t "$SESSION" -n "chrome"
tmux send-keys -t "$SESSION:chrome" "cd $PWD && sleep 3 && ./scripts/debug-chrome.sh $URL" C-m

# デフォルトウィンドウを server に設定
tmux select-window -t "$SESSION:server"

echo ""
echo -e "${GREEN}✅ デバッグセッションを起動しました${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  tmux 操作方法${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${YELLOW}アタッチ:${NC}      tmux attach-session -t $SESSION"
echo -e "  ${YELLOW}デタッチ:${NC}      Ctrl+b → d"
echo -e "  ${YELLOW}ウィンドウ切替:${NC} Ctrl+b → n (次) / p (前) / 0-9 (番号)"
echo -e "  ${YELLOW}ペイン切替:${NC}    Ctrl+b → 矢印キー"
echo -e "  ${YELLOW}終了:${NC}          tmux kill-session -t $SESSION"
echo ""
echo -e "${GREEN}📝 セッション構成:${NC}"
echo -e "  - ${YELLOW}server${NC}: 開発サーバー + ログ監視"
echo -e "  - ${YELLOW}chrome${NC}: Chrome デバッグモード"
echo ""

# 自動アタッチ
echo -e "${GREEN}3秒後にセッションにアタッチします...${NC}"
sleep 3
tmux attach-session -t "$SESSION"
