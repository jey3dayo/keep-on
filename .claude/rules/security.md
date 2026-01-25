---
paths: "**/*.{ts,tsx}"
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
