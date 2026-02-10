# フロントエンドデバッグガイド

KeepOn プロジェクトのブラウザデバッグ手順。汎用的なツール知識は `chrome-debug` skill を参照。

## ツール選択

| 目的                           | ツール              |
| ------------------------------ | ------------------- |
| ページ操作・スクリーンショット | agent-browser       |
| JS 実行・Cookie・Network 確認  | MCP Chrome DevTools |
| ブレークポイント設定           | Chrome F12（手動）  |

## プロジェクト固有の診断対象

### ダッシュボード (`/dashboard`)

- 「rendering...」で止まる → `agent-browser snapshot -i` で DOM 確認
- 習慣一覧が表示されない → Network で `/dashboard` API レスポンスを確認
- チェックインが反映されない → Console エラーと楽観的更新のロールバックを確認

### タイムゾーン Cookie (`ko_tz`)

初回アクセス時に設定される。未設定だと無限リロードの原因になりうる。

```javascript
// MCP evaluate_script で確認
(() => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const koTz = document.cookie
    .split("; ")
    .find((r) => r.startsWith("ko_tz="))
    ?.split("=")[1];
  return { browserTz: tz, koTz: koTz || "NOT_SET", match: tz === koTz };
})();
```

### Clerk 認証

- headless でリダイレクトループ → 実ブラウザで問題なければ headless 固有（無視可）
- ログインフローのテストは `testing.md` のクイックリファレンスを参照

## WSL2 環境でのセットアップ

Chrome リモートデバッグの起動:

```bash
# デバッグ用スクリプトがある場合
./scripts/debug-chrome.sh http://localhost:3000/dashboard

# 手動起動
WIN_USER=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --remote-debugging-port=9222 \
  --remote-debugging-address=0.0.0.0 \
  --user-data-dir="C:\\Users\\${WIN_USER}\\AppData\\Local\\Temp\\chrome-mcp-debug" \
  http://localhost:3000/dashboard
```

MCP 接続確認:

```bash
WIN_HOST_IP=$(ip route show default | grep -oP '(?<=via )\d+(\.\d+){3}')
wget -qO- "http://${WIN_HOST_IP}:9222/json/version"
```

**重要**: WSL2 では `localhost` ではなく Windows ホスト IP（デフォルトゲートウェイ）を使う。

## スクリーンショット保存先

```bash
DEBUG_DIR=~/user_home/Downloads/debug/$(date +%Y%m%d%H%M)
mkdir -p "$DEBUG_DIR"
```

## Cloudflare Workers ログとの突き合わせ

ブラウザ操作と同時に Workers ログを監視して問題を切り分ける:

```bash
# 別ターミナルで
pnpm cf:logs
```

確認ポイント:

- `request.dashboard:start` / `request.dashboard:end` が出るか
- `:timeout` / `TimeoutError` が出ていないか
- `db.connection` が毎回出続けないか（過剰再接続）
