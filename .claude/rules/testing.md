# Clerk テストユーザー管理ガイド

## 概要

開発・テスト環境でのClerkログインを効率化するためのガイドです。

## Clerk テストモード

Clerkの開発インスタンスでは、デフォルトで**テストモード**が有効になっています。

**特徴:**

- メール/SMSの実際の送信が不要
- 開発用の疑似識別子が使用可能
- 固定の認証コードでログイン可能

## テスト用識別子

### メールアドレス

**ルール**: ローカルパートの末尾に `+clerk_test` を追加

**例:**

- `test+clerk_test@example.com`
- `jane+clerk_test@example.com`
- `user123+clerk_test@domain.org`

**形式:**

```text
<username>+clerk_test@<domain>
```

### 電話番号

**ルール**: 下4桁が `0100` 〜 `0199` の範囲

**例:**

- `+1 (201) 555-0100`
- `+1 (973) 555-0133`
- `+12015550199`

**形式:**

```text
+1<area code>555-01<00-99>
```

## 認証コード

すべてのOTP認証（メール・SMS）で固定値 `424242` を使用します。

**適用される認証フロー:**

- メールアドレス認証
- 電話番号（SMS）認証
- パスコード認証

## 手動テスト手順

### サインアップフロー

1. **サインアップページへアクセス**

   ```text
   http://localhost:3000/sign-up
   ```

2. **テストメールアドレスを入力**

   ```text
   test+clerk_test@example.com
   ```

3. **認証コード入力**

   ```text
   424242
   ```

4. **ログイン完了**
   - ダッシュボードへリダイレクト
   - セッションが確立されていることを確認

### サインインフロー

1. **サインインページへアクセス**

   ```text
   http://localhost:3000/sign-in
   ```

2. **登録済みテストメールアドレスを入力**

   ```text
   test+clerk_test@example.com
   ```

3. **認証コード入力**

   ```text
   424242
   ```

4. **ログイン完了**

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
    // Clerkのテスト用ストレージ状態を保存
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

test.describe("Authentication", () => {
  test("should sign up with test email", async ({ page }) => {
    await page.goto("/sign-up");

    // テストメールアドレスを入力
    await page.fill('input[name="email"]', "test+clerk_test@example.com");
    await page.click('button[type="submit"]');

    // 認証コードを入力
    await page.fill('input[name="code"]', "424242");
    await page.click('button[type="submit"]');

    // ダッシュボードへリダイレクトされることを確認
    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("should sign out", async ({ page }) => {
    // Clerkクライアントを使用してサインアウト
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

// 認証済みテスト拡張
export const test = base.extend<{
  authenticatedPage: typeof clerkClient;
}>({
  authenticatedPage: async ({ page }, use) => {
    // テストユーザーでサインイン
    await page.goto("/sign-in");
    await page.fill('input[name="email"]', "test+clerk_test@example.com");
    await page.click('button[type="submit"]');
    await page.fill('input[name="code"]', "424242");
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

export async function signInWithTestUser(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.fill('input[name="email"]', email);
  await page.click('button[type="submit"]');

  // 認証コード入力
  const codeInput = page.locator('input[name="code"]');
  await codeInput.waitFor({ state: "visible" });
  await codeInput.fill("424242");
  await page.click('button[type="submit"]');

  // ログイン完了を待機
  await page.waitForURL("/dashboard");
}

export async function signOut(page: Page) {
  const { clerkClient } = await import("@clerk/testing/playwright");
  await clerkClient.signOut();
}
```

## トラブルシューティング

### 認証コード `424242` が受け付けられない

**原因**: プロダクション環境でテスト識別子を使用している

**解決方法**:

1. Clerk Dashboard で「Development」インスタンスを使用しているか確認
2. 環境変数 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` が開発用キーか確認

### テストメールアドレスでサインアップできない

**原因**: `+clerk_test` サブアドレスの形式が間違っている

**解決方法**:

```text
❌ 誤: clerk_test@example.com
❌ 誤: test+clerktest@example.com
✅ 正: test+clerk_test@example.com
```

### E2Eテストでセッションが保持されない

**原因**: `storageState` のパスが間違っている

**解決方法**:

```typescript
// playwright.config.ts
use: {
  storageState: 'e2e/storage-state.json', // 相対パスを確認
}
```

## 開発時のベストプラクティス

### テストユーザーの管理

**推奨:**

- 開発用に固定のテストメールアドレスを使用
  - `dev+clerk_test@example.com`
  - `staging+clerk_test@example.com`
- 各環境で異なるメールアドレスを使用して混同を防ぐ

**非推奨:**

- 本番用のメールアドレスをテストに使用
- ランダムなメールアドレスを毎回生成

### セッションの永続化

ローカル開発時はブラウザのLocalStorageにセッションが保存されるため、再読み込みでもログイン状態が維持されます。

**セッションクリア:**

```typescript
// Clerkクライアントでサインアウト
await clerkClient.signOut();

// またはLocalStorageを直接削除
localStorage.clear();
```

## 参考リンク

- [Clerk Testing ドキュメント](https://clerk.com/docs/testing/overview)
- [Playwright インテグレーション](https://clerk.com/docs/testing/playwright)
- [Clerk Dashboard](https://dashboard.clerk.com/)
- [環境変数設定](./dotenvx.md)

---

**関連ドキュメント:**

- [dotenvx 環境変数管理](./dotenvx.md) - Clerk APIキーの設定方法
- [セキュリティガイドライン](./security.md) - 認証情報の取り扱いについて
