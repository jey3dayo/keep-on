<!-- markdownlint-disable MD024 -->

# Clerk テストユーザー管理ガイド

## 概要

開発・テスト環境での Clerk ログインを効率化するためのガイドです。

## クイックリファレンス

このセクションの値を**唯一の正**として扱い、以降はプレースホルダで参照します。

### 推奨テストユーザー（1件だけ使う場合）

- メールアドレス: `jane+clerk_test@example.com`
- パスワード: `dyc.PBR3pjc.cmh!fmx`
- OTP（テストモード）: `424242`

### 固定テストメール（環境別）

- `dev+clerk_test@example.com`
- `staging+clerk_test@example.com`

### プレースホルダ

- `<TEST_EMAIL>` = 推奨テストユーザーのメールアドレス
- `<TEST_PASSWORD>` = 推奨テストユーザーのパスワード
- `<TEST_OTP>` = 推奨テストユーザーの OTP

## agent-browser スクリーンショット保存先

- WSL2 環境でスクリーンショットをユーザーに見てもらう場合は、必ず `~/user_home/Downloads/debug/<YYYYMMDDHHMM>` に保存する
- 日付フォルダ形式: `YYYYMMDDHHMM`（例: `202602042208`）
- 上記は C ドライブの Downloads へのシンボリックリンク
- **重要**: 毎回新しい日付フォルダを作成してから保存すること

## テストユーザー運用方針

### 推奨

- クイックリファレンスの値を共通のテスト基準として使用
- 環境ごとに固定のテストメールアドレスを使い分ける

### 非推奨

- 本番用のメールアドレスをテストに使用
- ランダムなメールアドレスを毎回生成

## Clerk テストモード

Clerk の開発インスタンスでは、デフォルトで**テストモード**が有効になっています。

### 特徴

- メール/SMS の実際の送信が不要
- 開発用の疑似識別子が使用可能
- 固定の認証コードでログイン可能

### テスト用識別子

#### メールアドレス

**ルール**: ローカルパートの末尾に `+clerk_test` を追加

#### 例

- `test+clerk_test@example.com`
- `sample+clerk_test@example.com`
- `user123+clerk_test@domain.org`

#### 形式

```text
<username>+clerk_test@<domain>
```

#### 電話番号

**ルール**: 下4桁が `0100` 〜 `0199` の範囲

#### 例

- `+1 (201) 555-0100`
- `+1 (973) 555-0133`
- `+12015550199`

#### 形式

```text
+1<area code>555-01<00-99>
```

### 認証コード

すべての OTP 認証（メール・SMS）で固定値を使用します。値はクイックリファレンスを参照してください。

#### 適用される認証フロー

- メールアドレス認証
- 電話番号（SMS）認証
- パスコード認証

### テスト用パスワード

テスト環境で使用する固定パスワードはクイックリファレンスを参照してください。

## 手動テスト手順

### サインインフロー

1. サインインページへアクセス
   `http://localhost:3000/sign-in`
2. メールアドレスに `<TEST_EMAIL>` を入力
3. パスワードに `<TEST_PASSWORD>` を入力
4. `Continue` を押す
5. 認証コード（OTP）画面に遷移したら `<TEST_OTP>` を入力
6. `Continue` を押してダッシュボードへ遷移することを確認

#### 補足

- パスワード送信後に `sign-in/factor-two` へ遷移する場合があります
- 認証コード欄が表示されたら `<TEST_OTP>` を入力してください

### サインアップフロー

1. サインアップページへアクセス

   ```text
   http://localhost:3000/sign-up
   ```

2. テストメールアドレスを入力

   ```text
   <TEST_EMAIL>
   ```

3. 認証コードを入力

   ```text
   <TEST_OTP>
   ```

4. ログイン完了
   - ダッシュボードへリダイレクト
   - セッションが確立されていることを確認

## E2E テスト導入ガイド

### インストール

```bash
pnpm add -D @clerk/testing
```

### Playwright 設定

`playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  use: {
    // Clerk のテスト用ストレージ状態を保存
    storageState: "e2e/storage-state.json",
  },
  // プロジェクトごとの設定
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

### テストコード例

`tests/e2e/auth.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { clerkClient } from "@clerk/testing/playwright";

const TEST_EMAIL = "<TEST_EMAIL>";
const TEST_OTP = "<TEST_OTP>";

test.describe("Authentication", () => {
  test("should sign up with test email", async ({ page }) => {
    await page.goto("/sign-up");

    // テストメールアドレスを入力
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]');

    // 認証コードを入力
    await page.fill('input[name="code"]', TEST_OTP);
    await page.click('button[type="submit"]');

    // ダッシュボードへリダイレクトされることを確認
    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("should sign out", async ({ page }) => {
    // Clerk クライアントを使用してサインアウト
    await clerkClient.signOut();

    // サインインページへリダイレクトされることを確認
    await expect(page).toHaveURL("/sign-in");
  });
});
```

### ストレージ状態の再利用

認証済みセッションを再利用する場合:

```typescript
import { test as base } from "@playwright/test";
import { clerkClient } from "@clerk/testing/playwright";

const TEST_EMAIL = "<TEST_EMAIL>";
const TEST_OTP = "<TEST_OTP>";

// 認証済みテスト拡張
export const test = base.extend<{
  authenticatedPage: typeof clerkClient;
}>({
  authenticatedPage: async ({ page }, use) => {
    // テストユーザーでサインイン
    await page.goto("/sign-in");
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]');
    await page.fill('input[name="code"]', TEST_OTP);
    await page.click('button[type="submit"]');

    // セッション状態を保存
    await page.context().storageState({ path: "e2e/storage-state.json" });

    await use(clerkClient);
  },
});
```

### ヘルパー関数

`tests/helpers/auth.ts`:

```typescript
import { Page } from "@playwright/test";

const TEST_OTP = "<TEST_OTP>";

export async function signInWithTestUser(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.fill('input[name="email"]', email);
  await page.click('button[type="submit"]');

  // 認証コード入力
  const codeInput = page.locator('input[name="code"]');
  await codeInput.waitFor({ state: "visible" });
  await codeInput.fill(TEST_OTP);
  await page.click('button[type="submit"]');

  // ログイン完了を待機
  await page.waitForURL("/dashboard");
}

export async function signOut(page: Page) {
  const { clerkClient } = await import("@clerk/testing/playwright");
  await clerkClient.signOut();
}
```

## agent-browser StorageState 統合

Playwright認証状態の再利用により、agent-browserでのデバッグ時にログイン操作を省略できます。

### 概要

E2Eテストで生成した認証状態（`e2e/storage-state.json`）をagent-browserで再利用することで、以下のメリットがあります：

- **高速化**: ログイン操作（メール→パスワード→OTP）を毎回実行する必要がない
- **信頼性向上**: 認証フローのエラーでデバッグ作業が中断されない
- **効率化**: デバッグ作業に集中できる

### セットアップ手順

#### 1. Playwrightインストール

```bash
# Playwright本体とChromiumブラウザをインストール
pnpm exec playwright install chromium
```

#### 2. 認証状態生成

初回のみ、Clerk認証状態を生成します：

```bash
# 開発サーバーを起動（別ターミナル）
pnpm env:run -- pnpm dev

# 認証状態を生成
./scripts/setup-auth-state.sh
```

このスクリプトは以下の処理を自動化します：

1. Playwrightとブラウザのインストール確認
2. 開発サーバー起動確認
3. Clerkログインフロー実行
4. 認証状態を`e2e/storage-state.json`に保存
5. Cookie数とファイルサイズの検証

#### 3. agent-browserで使用

認証状態を読み込んだChromeを起動します：

```bash
# ダッシュボードをログイン済み状態で開く
pnpm exec tsx scripts/agent-browser-playwright.ts

# 任意のURLを指定することも可能
pnpm exec tsx scripts/agent-browser-playwright.ts http://localhost:3000/habits
pnpm exec tsx scripts/agent-browser-playwright.ts https://keep-on.j138cm.workers.dev
```

起動後、以下の状態で利用できます：

- リモートデバッグポート: `9222`
- ログイン済み状態でページが開かれている
- MCP Chrome DevToolsが自動的に接続

### 認証状態の更新タイミング

以下の場合は認証状態を再生成する必要があります：

1. Clerk設定変更時:
   - 認証方式の変更（2FA有効化/無効化など）
   - テストユーザーのパスワード変更

2. セッション期限切れ時:
   - Clerkセッションは通常30日で期限切れ
   - 期限切れ後に`./scripts/setup-auth-state.sh`を再実行

3. 認証エラー発生時:
   - ログインフォームが表示される
   - 認証状態が無効になっている

### トラブルシューティング

#### 認証状態ファイルが見つからない

**エラー**: `❌ エラー: e2e/storage-state.json が見つかりません`

#### 解決方法

```bash
# 認証状態を生成
./scripts/setup-auth-state.sh
```

#### agent-browserでログインフォームが表示される

**原因**: セッション期限切れまたは認証状態が無効

#### 解決方法

```bash
# 既存の認証状態を削除
rm e2e/storage-state.json

# 認証状態を再生成
./scripts/setup-auth-state.sh
```

#### 開発サーバーが起動していない

**エラー**: `✗ 開発サーバーが起動していません`

#### 解決方法

```bash
# 別のターミナルで開発サーバーを起動
pnpm env:run -- pnpm dev
```

#### Chromiumブラウザがインストールされていない

**エラー**: Playwrightがブラウザを見つけられない

#### 解決方法

```bash
# Chromiumブラウザをインストール
pnpm exec playwright install chromium
```

### 使用例

#### ダッシュボードのデバッグ

```bash
# 認証状態を生成（初回のみ）
./scripts/setup-auth-state.sh

# ログイン済み状態でダッシュボードを開く
pnpm exec tsx scripts/agent-browser-playwright.ts

# agent-browserでスクリーンショット取得
# MCP Chrome DevToolsが自動的に接続されています
```

#### 習慣ページのデバッグ

```bash
# ログイン済み状態で習慣ページを開く
pnpm exec tsx scripts/agent-browser-playwright.ts http://localhost:3000/habits
```

#### Cloudflare Workers 環境のデバッグ

```bash
# 本番環境をログイン済み状態で開く
pnpm exec tsx scripts/agent-browser-playwright.ts https://keep-on.j138cm.workers.dev
```

**注意**: 本番環境の認証状態は開発環境とは別のため、本番用の認証状態を別途生成する必要があります。

### package.jsonスクリプト

便利なスクリプトがpackage.jsonに追加されています：

```bash
# E2Eテスト実行
pnpm test:e2e

# E2EテストUIモード
pnpm test:e2e:ui

# 認証状態生成のみ
pnpm test:e2e:setup

# 認証状態生成スクリプト
pnpm agent:setup

# agent-browser起動
pnpm agent:browser
```

### 参考情報

- Playwright認証ガイド: https://playwright.dev/docs/auth
- Playwrightセットアップスクリプト: `e2e/auth.setup.ts`
- agent-browser起動スクリプト: `scripts/agent-browser-playwright.ts`
- 認証状態自動生成: `scripts/setup-auth-state.sh`

## トラブルシューティング

### 認証コードが受け付けられない

**原因**: プロダクション環境でテスト識別子を使用している

#### 解決方法

1. Clerk Dashboard で「Development」インスタンスを使用しているか確認
2. 環境変数 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` が開発用キーか確認

### テストメールアドレスでサインアップできない

**原因**: `+clerk_test` サブアドレスの形式が間違っている

#### 解決方法

```text
❌ 誤: clerk_test@example.com
❌ 誤: test+clerktest@example.com
✅ 正: test+clerk_test@example.com
```

### E2E テストでセッションが保持されない

**原因**: `storageState` のパスが間違っている

#### 解決方法

```typescript
// playwright.config.ts
use: {
  storageState: "e2e/storage-state.json", // 相対パスを確認
}
```

## 開発時のベストプラクティス

### セッションの永続化

ローカル開発時はブラウザの LocalStorage にセッションが保存されるため、再読み込みでもログイン状態が維持されます。

### セッションクリア

```typescript
// Clerk クライアントでサインアウト
await clerkClient.signOut();

// または LocalStorage を直接削除
localStorage.clear();
```

## Cloudflare Workers 確認シナリオ（ログ付き）

Cloudflare 本番環境での「ログイン → ダッシュボードでチェックイン → 習慣ページ遷移」を、
Workers のログと突き合わせて確認するための手順です。

### 前提

- 対象: `https://keep-on.j138cm.workers.dev`
- Cloudflare ログは **別ターミナル** で監視する

### 手順

1. ログ監視を開始

   ```bash
   pnpm cf:logs
   ```

2. `/dashboard` にアクセス
3. サインイン画面に遷移した場合は、`<TEST_EMAIL>` / `<TEST_PASSWORD>` / `<TEST_OTP>` でログイン
4. ダッシュボードで習慣一覧が表示されることを確認
5. 任意の習慣でチェックインを 1 回トグル
6. `/habits` へ遷移し、習慣一覧ページが表示されることを確認
7. ログを停止して結果を確認（Ctrl + C）

### 補強チェック観点（ログ + UI）

- Cloudflare ログ
  - `request.dashboard:start` / `request.dashboard:end` が連続して出る
  - `request.habits:start` / `request.habits:end` が出る
  - `:timeout` / `TimeoutError` が出ていない
  - `GET /dashboard` / `GET /habits` が `Ok` になっている
  - `dashboard.syncUser` / `dashboard.habits` / `dashboard.checkins` の `ms` がタイムアウト上限以内
  - `db.connection` が毎回出続けない（過剰な再接続が起きていない）
  - `Clerk: Refreshing the session token resulted in an infinite redirect loop` が出ていない
- UI
  - チェックイン後に進捗表示が 1 つ増える（例: `6 / 7` → `7 / 7`）
  - 連打時に重複反映しない（同一習慣の多重チェックインが起きない）
  - 失敗時はトーストでエラーが見える

### 追加チェック（補強）

- **チェックイン上限**: すでに達成済みの習慣でトグルしても進捗が増えない
- **タイムゾーン Cookie**: 初回アクセス時に `ko_tz` が設定され、無限リロードにならない
- **戻る遷移**: `/habits` から `/dashboard` に戻ってもチェックイン状態が維持される

### 失敗時の切り分けメモ

- **ログに POST /dashboard が出ない**: クライアント側イベント未発火の可能性
- **ログに :timeout / TimeoutError**: DB か Server Action のタイムアウトを疑う
- **Clerk のリダイレクトループ警告**: Clerk キー不整合の可能性が高い

## 参考リンク

- [Clerk Testing ドキュメント](https://clerk.com/docs/testing/overview)
- [Playwright インテグレーション](https://clerk.com/docs/testing/playwright)
- [Clerk Dashboard](https://dashboard.clerk.com/)
- [環境変数設定](./dotenvx.md)

---

## 関連ドキュメント

- [dotenvx 環境変数管理](./dotenvx.md) - Clerk API キーの設定方法
- [セキュリティガイドライン](./security.md) - 認証情報の取り扱いについて
