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

#### 重要

## agent-browser with storageState

Playwright認証状態を使用して、ログイン済み状態でagent-browserを起動できます。

#### メリット

- ログイン操作（メール→パスワード→OTP）を省略
- デバッグ作業の高速化（起動時間が2-3分 → 30秒以内）
- 認証フローのエラーを回避

#### セットアップ (初回のみ)

```bash
# 1. 開発サーバーを起動（別ターミナル）
pnpm env:run -- pnpm dev

# 2. 認証状態を生成
./scripts/setup-auth-state.sh
```

#### 使用方法

```bash
# ログイン済み状態でダッシュボードを開く
pnpm exec tsx scripts/agent-browser-playwright.ts

# 任意のURLを指定
pnpm exec tsx scripts/agent-browser-playwright.ts http://localhost:3000/habits
```

#### 注意事項

- 認証状態の有効期限: 約30日
- 期限切れ時は `./scripts/setup-auth-state.sh` を再実行
- 詳細は `testing.md` の「agent-browser StorageState 統合」セクションを参照

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
