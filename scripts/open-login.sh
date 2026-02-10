#!/usr/bin/env bash
# Windows Chrome でログインページを開く簡易スクリプト

set -euo pipefail

# 認証情報を表示
cat << 'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 Clerk ログインテスト
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 テストユーザー: jane+clerk_test@example.com
🔑 パスワード: dyc.PBR3pjc.cmh!fmx
🔢 OTP: 424242

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

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

# サインインページを開く
URL="http://localhost:3000/sign-in"
echo ""
echo "🚀 Chrome でサインインページを開きます..."
echo "📍 URL: $URL"
echo ""

"$CHROME" "$URL" &

echo "✅ Chrome を起動しました"
echo ""
echo "📝 次の手順:"
echo "  1. メールアドレスを入力: jane+clerk_test@example.com"
echo "  2. Continue をクリック"
echo "  3. パスワードを入力: dyc.PBR3pjc.cmh!fmx"
echo "  4. Continue をクリック"
echo "  5. OTP を入力（表示された場合）: 424242"
echo "  6. ダッシュボードに遷移することを確認"
echo ""
echo "💡 DevTools (F12) を開いて Console / Network タブを確認してください"
