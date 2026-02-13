---
paths:
  - "**/*.{ts,tsx}"
---

# セキュリティガイドライン

## Clerk JWT 検証

### Edge での JWT 検証

Clerk の JWT 検証は Edge Runtime で実施してください。
認証が必要なエンドポイントやページでは、必ず `auth()` または `currentUser()` で認証状態を確認してください。

**Server Component での認証チェック:**

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // 認証済みユーザーのみアクセス可能
  return <div>Protected Content</div>;
}
```

**API Route での認証チェック:**

```tsx
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 認証済みユーザーのみアクセス可能
  return NextResponse.json({ data: "..." });
}
```

## DATABASE_URL 管理

### service-role 権限での管理

`DATABASE_URL` は Supabase の service-role 権限を持つ接続文字列を使用してください。
この接続文字列はサーバーサイドでのみ使用し、クライアントに公開しないでください。

**環境変数設定:**

```env
# Supabase Transaction Mode (Port 6543)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@[host]:6543/postgres?pgbouncer=true"
```

**注意事項:**

- Transaction Mode (Port 6543) を使用
- `?pgbouncer=true` パラメータを必ず追加
- パスワードは平文で保存せず、dotenvx で暗号化

## dotenvx 秘密鍵管理

### CI Secrets での秘密鍵管理

dotenvx の秘密鍵（`DOTENV_PRIVATE_KEY`）は、リポジトリに含めず CI/CD の Secrets で管理してください。

**GitHub Actions での設定例:**

```yaml
- name: Decrypt env
  env:
    DOTENV_PRIVATE_KEY: ${{ secrets.DOTENV_PRIVATE_KEY }}
  run: pnpm env:run -- echo "Environment loaded"
```

**ローカル開発:**

- `.env.keys` ファイルはローカルのみで使用
- `.env.keys` は `.gitignore` に追加済み
- チームメンバーには安全な方法で秘密鍵を共有（1Password, AWS Secrets Manager など）

### 暗号化のベストプラクティス

1. **機密情報のみ暗号化:**

   - API キー、シークレットトークン
   - データベース接続文字列
   - 認証プロバイダーの秘密鍵

2. **非機密情報は平文OK:**

   - 公開API URL
   - フィーチャーフラグ
   - 環境識別子（development, production など）

3. **暗号化コマンド:**

   ```bash
   # .env を暗号化して .env.vault を生成
   pnpm env:encrypt

   # 暗号化された環境変数を使って実行
   pnpm env:run -- pnpm dev
   ```

## Content Security Policy (CSP)

### CSP ヘッダー設定

`next.config.ts` でCSPヘッダーを設定しています。これによりXSS攻撃のリスクを軽減します。

**設定内容:**

- `default-src 'self'`: デフォルトは自己ホストのみ
- `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev`: Clerk認証に必要
- `style-src 'self' 'unsafe-inline'`: Tailwind CSSのインラインスタイル対応
- `img-src 'self' data: blob: https://img.clerk.com`: 画像ソース
- `connect-src 'self' https://clerk.com https://*.clerk.accounts.dev https://keep-on.j138cm.workers.dev`: API接続
- `frame-ancestors 'none'`: iframe内での表示を禁止（クリックジャッキング対策）

**注意:**
`'unsafe-eval'`と`'unsafe-inline'`はNext.jsとClerkの動作に必要ですが、セキュリティリスクがあります。
将来的には`nonce`や`hash`ベースのCSPへ移行を検討してください。

## ブルートフォース攻撃対策

### Clerk のレート制限設定

Clerk Dashboardで以下を設定してください：

1. **Sign-in試行回数制限**

   - Clerk Dashboard → Settings → Security → Sign-in
   - 推奨設定: 5回失敗で15分間ロック

2. **Sign-up試行回数制限**

   - 同一IPアドレスからの連続登録を制限
   - 推奨設定: 1時間あたり3回まで

3. **CAPTCHA の有効化**
   - Clerk Dashboard → Settings → Security → CAPTCHA
   - 推奨: 3回失敗後にCAPTCHA表示

### 多要素認証（MFA）実装計画

**現状:** 未実装

**実装ステップ:**

1. **Phase 1: Clerk MFA有効化**（工数: 1日）

   - Clerk Dashboard → Settings → Security → Multi-factor
   - TOTPアプリ（Google Authenticator、Authy等）対応を有効化
   - SMS OTPは追加コストのため保留

2. **Phase 2: UIカスタマイズ**（工数: 0.5日）

   - ユーザー設定ページにMFA有効化トグルを追加
   - `/settings` ページに「セキュリティ」タブを追加

3. **Phase 3: ドキュメント整備**（工数: 0.5日）
   - ユーザー向けMFAセットアップガイド作成
   - 開発者向け実装ガイドを`security.md`に追記

**推奨タイムライン:**

- Phase 1: v0.3.0リリース時
- Phase 2-3: v0.4.0リリース時

## その他のセキュリティ対策

### 1. 入力検証

ユーザー入力は必ず検証してください。特にデータベースクエリに使用する前には必須です。

**Valibot などを使った検証例:**

```tsx
import * as v from "valibot";

const UserSchema = v.object({
  email: v.pipe(v.string(), v.email()),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = v.safeParse(UserSchema, body);

  if (!result.success) {
    return NextResponse.json({ error: result.issues }, { status: 400 });
  }

  // 検証済みデータを使用
  const { email, name } = result.output;
}
```

### 2. CSRF 対策

Next.js App Router では、Server Actions が CSRF トークンを自動的に処理します。
カスタム API Route を作成する場合は、適切な CSRF 対策を実装してください。

### 3. XSS 対策

React は自動的に XSS 対策を行いますが、`dangerouslySetInnerHTML` を使用する場合は、
DOMPurify などのサニタイザーを使用してください。

**良い例:**

```tsx
import DOMPurify from "isomorphic-dompurify";

export function SafeHtml({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```
