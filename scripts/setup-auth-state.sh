#!/bin/bash

# Clerk認証状態生成スクリプト
#
# このスクリプトは以下の処理を自動化します:
# 1. Playwrightインストール確認
# 2. 開発サーバー起動確認
# 3. 既存の認証状態ファイル削除
# 4. Playwrightセットアップテスト実行
# 5. 認証状態ファイル生成確認

set -euo pipefail

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# プロジェクトルートディレクトリ
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORAGE_STATE="${PROJECT_ROOT}/e2e/storage-state.json"

echo "📋 Clerk認証状態生成スクリプト"
echo "================================"
echo ""

# Step 1: Playwrightインストール確認
echo "🔍 Step 1: Playwrightインストールを確認中..."
if ! pnpm exec playwright --version &>/dev/null; then
  echo -e "${RED}✗ Playwrightがインストールされていません${NC}"
  echo ""
  echo "以下のコマンドでインストールしてください:"
  echo "  pnpm exec playwright install chromium"
  exit 1
fi
echo -e "${GREEN}✓ Playwright installed${NC}"
echo ""

# Step 2: Chromiumブラウザインストール確認
echo "🔍 Step 2: Chromiumブラウザを確認中..."
# Chromiumをインストール（既にインストール済みの場合は自動的にスキップされる）
pnpm exec playwright install chromium > /dev/null 2>&1 || true
echo -e "${GREEN}✓ Chromium browser ready${NC}"
echo ""

# Step 3: 開発サーバー起動確認
echo "🔍 Step 3: 開発サーバーの起動を確認中..."
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠ 開発サーバーが起動していません${NC}"
  echo -e "${YELLOW}  → Playwrightが自動的にサーバーを起動します${NC}"
else
  echo -e "${GREEN}✓ Development server is running${NC}"
fi
echo ""

# Step 4: 既存の認証状態ファイル削除
if [ -f "${STORAGE_STATE}" ]; then
  echo "🗑️  Step 4: 既存の認証状態ファイルを削除中..."
  rm "${STORAGE_STATE}"
  echo -e "${GREEN}✓ Removed existing storage-state.json${NC}"
  echo ""
else
  echo "ℹ️  Step 4: 既存の認証状態ファイルは存在しません"
  echo ""
fi

# Step 5: Playwrightセットアップテスト実行
echo "🚀 Step 5: Clerk認証状態を生成中..."
echo ""
cd "${PROJECT_ROOT}"

# setup プロジェクトのみを実行
if pnpm exec playwright test --project=setup; then
  echo ""
  echo -e "${GREEN}✓ Authentication state generated successfully!${NC}"
else
  echo ""
  echo -e "${RED}✗ Failed to generate authentication state${NC}"
  echo ""
  echo "トラブルシューティング:"
  echo "  1. Clerkテストモードが有効か確認してください"
  echo "  2. テストユーザーの認証情報が正しいか確認してください"
  echo "  3. ログを確認してエラー内容を特定してください"
  exit 1
fi
echo ""

# Step 6: 認証状態ファイル生成確認
echo "🔍 Step 6: 認証状態ファイルを確認中..."
if [ ! -f "${STORAGE_STATE}" ]; then
  echo -e "${RED}✗ storage-state.json が生成されていません${NC}"
  exit 1
fi

# ファイルサイズとCookie数を確認
FILE_SIZE=$(du -h "${STORAGE_STATE}" | cut -f1)
COOKIE_COUNT=$(jq '.cookies | length' "${STORAGE_STATE}")

echo -e "${GREEN}✓ storage-state.json generated${NC}"
echo "  📁 ファイルサイズ: ${FILE_SIZE}"
echo "  🍪 Cookie数: ${COOKIE_COUNT}"
echo ""

# 完了メッセージ
echo "================================"
echo -e "${GREEN}✅ 認証状態の生成が完了しました！${NC}"
echo ""
echo "次のステップ:"
echo "  1. agent-browserで認証状態を使用:"
echo "     pnpm exec tsx scripts/agent-browser-playwright.ts"
echo ""
echo "  2. E2Eテストを実行:"
echo "     pnpm exec playwright test"
echo ""
echo "  3. 認証状態の有効期限（約30日）が切れたら、このスクリプトを再実行:"
echo "     ./scripts/setup-auth-state.sh"
echo ""
