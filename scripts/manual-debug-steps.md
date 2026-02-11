# ダッシュボード「rendering...」手動診断手順

## 前提条件

Chrome が http://localhost:3000/dashboard で起動している状態

## Step 1: Console エラー確認

1. **F12** を押して DevTools を開く
2. **Console** タブを選択
3. 以下のエラーがないか確認:

```text
❌ 確認すべきエラー:
- Uncaught TypeError
- Clerk: Refreshing the session token resulted in an infinite redirect loop
- Hydration failed
- TimeoutError
- Cannot read properties of undefined
```

## Step 2: Network リクエスト確認

1. **Network** タブを選択
2. **F5** でページをリロード
3. 以下を確認:

```text
❌ 確認すべき問題:
- /dashboard への複数回のリクエスト (無限ループ)
- Status: 500, 503, timeout のリクエスト
- clerk.*.js の読み込み失敗
- _next/static/ の読み込み失敗
```

## Step 3: Cookie とタイムゾーン確認

Console タブで以下のスクリプトを実行:

```javascript
(() => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cookies = document.cookie;
  const koTzCookie = cookies
    .split("; ")
    .find((row) => row.startsWith("ko_tz="))
    ?.split("=")[1];

  console.log("====== タイムゾーン診断 ======");
  console.log("現在のタイムゾーン:", tz);
  console.log("ko_tz Cookie:", koTzCookie || "NOT_SET");
  console.log("一致:", tz === koTzCookie ? "✅" : "❌");
  console.log("全Cookie:", cookies);

  return {
    currentTimeZone: tz,
    koTzCookie: koTzCookie || "NOT_SET",
    match: tz === koTzCookie,
    allCookies: cookies,
  };
})();
```

**期待される出力:**

```javascript
{
  currentTimeZone: "Asia/Tokyo",
  koTzCookie: "Asia/Tokyo",
  match: true
}
```

**問題がある場合 (ko_tz が NOT_SET):**

```javascript
document.cookie = `ko_tz=${Intl.DateTimeFormat().resolvedOptions().timeZone}; path=/; max-age=31536000`;
location.reload();
```

## Step 4: React の状態確認

Console タブで以下のスクリプトを実行:

```javascript
(() => {
  const bodyText = document.body.innerText;
  const isStuck =
    bodyText.includes("読み込み中") ||
    bodyText.includes("rendering") ||
    bodyText.includes("loading");

  console.log("====== React 状態診断 ======");
  console.log("ページテキスト:", bodyText.substring(0, 200));
  console.log("読み込み中で停止:", isStuck ? "❌" : "✅");
  console.log(
    "ダッシュボード要素:",
    document.querySelector('[class*="dashboard"]') !== null ? "✅" : "❌",
  );
  console.log(
    "エラー表示:",
    document.querySelector('[role="alert"]') !== null ? "❌" : "✅",
  );

  return {
    bodyText: bodyText.substring(0, 200),
    isStuckOnLoading: isStuck,
    hasContent: document.querySelector('[class*="dashboard"]') !== null,
    hasError: document.querySelector('[role="alert"]') !== null,
  };
})();
```

## Step 5: スクリーンショット取得

1. **Ctrl+Shift+P** でコマンドパレットを開く
2. `Capture full size screenshot` を検索して実行
3. スクリーンショットを保存

または Windows Snipping Tool (Win+Shift+S) を使用

## 診断結果の分析

### パターン1: タイムゾーン Cookie の問題

**症状:**

- `ko_tz` Cookie が NOT_SET
- Console に無限リロードのログ
- Network に複数回の /dashboard リクエスト

**原因:**

DashboardWrapper が Cookie 設定とリロードを繰り返している

**修正案:**

```javascript
// Console で実行
document.cookie = `ko_tz=${Intl.DateTimeFormat().resolvedOptions().timeZone}; path=/; max-age=31536000`;
location.reload();
```

### パターン2: Clerk 認証エラー

**症状:**

- Console に `Clerk: ...` エラー
- Network に clerk API へのリクエスト失敗

**原因:**

Clerk の設定不備またはセッションタイムアウト

**修正案:**

1. `.env` の `CLERK_SECRET_KEY` を確認
2. サインアウトして再ログイン
3. Clerk Dashboard で設定確認

### パターン3: React Hydration エラー

**症状:**

- Console に `Hydration failed`
- `Text content does not match` エラー

**原因:**

SSR とクライアントの不一致

**修正案:**

1. ページをハードリロード (Ctrl+Shift+R)
2. キャッシュをクリア (DevTools > Application > Clear storage)
3. コンポーネントの条件分岐を確認

### パターン4: タイムアウトエラー

**症状:**

- Console に `TimeoutError`
- Network に長時間 pending のリクエスト

**原因:**

サーバー側のデータ取得が遅い

**修正案:**

1. DB 接続を確認 (`pnpm test:supabase`)
2. Cloudflare のログを確認 (`pnpm cf:logs`)
3. タイムアウト設定を調整

## 次のアクション

診断結果を以下の形式でまとめてください:

```markdown
## 診断結果

### Console エラー

- [ ] エラーなし
- [ ] Clerk エラー: [詳細]
- [ ] Hydration エラー: [詳細]
- [ ] タイムアウトエラー: [詳細]

### Network の状態

- [ ] 正常
- [ ] 無限リロード
- [ ] リクエスト失敗: [URL]

### Cookie 状態

- ko_tz: [値]
- 一致: ✅/❌

### 修正方針

[ここに具体的な修正案を記載]
```
