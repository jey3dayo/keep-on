---
paths:
  - "**/*.{ts,tsx}"
---

# セキュリティガイドライン

## Cloudflare Access JWT 検証

### Edge での JWT 検証

認証は Cloudflare Access（Zero Trust）に委譲しています。Access はリクエストへ `Cf-Access-Jwt-Assertion`
ヘッダーで署名済み JWT を付与し、アプリ側は `src/lib/auth/access.ts` の `getAccessIdentity()` が
Access の JWKS エンドポイント（`https://<team-domain>/cdn-cgi/access/certs`）で署名検証します。
認証が必要なエンドポイントやページでは、必ず `getAccessIdentity()` で認証状態を確認してください。

### Server Component での認証チェック

```tsx
import { redirect } from "next/navigation";
import { getAccessIdentity } from "@/lib/auth/access";

export default async function ProtectedPage() {
  const identity = await getAccessIdentity();

  if (!identity) {
    redirect("/");
  }

  // 認証済みユーザーのみアクセス可能
  return <div>Protected Content</div>;
}
```

### API Route での認証チェック

```tsx
import { NextResponse } from "next/server";
import { getAccessIdentity } from "@/lib/auth/access";

export async function GET() {
  const identity = await getAccessIdentity();

  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 認証済みユーザーのみアクセス可能
  return NextResponse.json({ data: "..." });
}
```

## dotenvx 秘密鍵管理

### CI Secrets での秘密鍵管理

dotenvx の秘密鍵（`DOTENV_PRIVATE_KEY`）は、リポジトリに含めず CI/CD の Secrets で管理してください。

### GitHub Actions での設定例

```yaml
- name: Decrypt env
  env:
    DOTENV_PRIVATE_KEY: ${{ secrets.DOTENV_PRIVATE_KEY }}
  run: pnpm env:run -- echo "Environment loaded"
```

### ローカル開発

- `.env.keys` ファイルはローカルのみで使用
- `.env.keys` は `.gitignore` に追加済み
- チームメンバーには安全な方法で秘密鍵を共有（1Password, AWS Secrets Manager など）

### 暗号化のベストプラクティス

1. 機密情報のみ暗号化:
   - API キー、シークレットトークン
   - データベース接続文字列
   - 認証プロバイダーの秘密鍵

2. 非機密情報は平文OK:
   - 公開API URL
   - フィーチャーフラグ
   - 環境識別子（development, production など）

3. 暗号化コマンド:

   ```bash
   # .env を暗号化して .env.vault を生成
   pnpm env:encrypt

   # 暗号化された環境変数を使って実行
   pnpm env:run -- pnpm dev
   ```

## Content Security Policy (CSP)

### CSP ヘッダー設定

`next.config.ts` でCSPヘッダーを設定しています。これによりXSS攻撃のリスクを軽減します。

### 設定内容

- `default-src 'self'`: デフォルトは自己ホストのみ
- `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com`: Next.js の動作と Cloudflare Turnstile / Analytics に必要
- `style-src 'self' 'unsafe-inline'`: Tailwind CSSのインラインスタイル対応
- `img-src 'self' data: blob:`: 画像ソース
- `connect-src 'self' https://keep-on.jey3dayo.net https://challenges.cloudflare.com https://cloudflareinsights.com`: API接続。Cloudflare Access 自体はエッジで JWT を検証してからオリジンへ到達するため、Access 用のドメインを CSP に追加する必要はない
- `frame-ancestors 'none'`: iframe内での表示を禁止（クリックジャッキング対策）

### 注意

`'unsafe-eval'`と`'unsafe-inline'`はNext.jsの動作に必要ですが、セキュリティリスクがあります。
将来的には`nonce`や`hash`ベースのCSPへ移行を検討してください。

## ブルートフォース攻撃対策

### Cloudflare Access のレート制限・MFA 設定

サインイン試行回数制限・CAPTCHA・多要素認証は Cloudflare Zero Trust ダッシュボード側に集約されています。
アプリ側でのレート制限実装は不要です。

1. Access ポリシーの認証方法
   - Zero Trust → Access → Applications → 対象アプリ → Policies
   - 許可する Identity Provider（Google など）とセッション有効期間を設定

2. IdP 側の多要素認証
   - Google Workspace など、選択した IdP 側で MFA を有効化する（Access 自体は MFA を実装せず IdP に委譲）

3. Access 側のログ監視
   - Zero Trust → Logs → Access で認証試行・ブロックを確認

（historical: 2026-08 に Clerk から Cloudflare Access へ移行。Clerk Dashboard での Sign-in/Sign-up レート制限や
組み込み MFA 有効化計画は Clerk 利用時の記録として過去に存在したが、現行の認証基盤には適用されない）

## その他のセキュリティ対策

### 1. 入力検証

ユーザー入力は必ず検証してください。特にデータベースクエリに使用する前には必須です。

### Valibot などを使った検証例

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

### 良い例

```tsx
import DOMPurify from "isomorphic-dompurify";

export function SafeHtml({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

## Cloudflare Access 認証戦略

### JWT / セッション方式

認証は Cloudflare Access（Zero Trust）に委譲しています。

- Access はユーザーがログインすると `Cf-Access-Jwt-Assertion` ヘッダーで署名済み JWT をリクエストへ付与する
- JWT の `aud`（`ACCESS_AUD`）と `issuer`（`https://<ACCESS_TEAM_DOMAIN>`）はアプリ側の環境変数と一致させる必要がある
- Access セッションの有効期間は Zero Trust ダッシュボードの Application Policy（Session Duration）で設定する

### JWT 検証の仕組み

`src/lib/auth/access.ts` の `getAccessIdentity()` が `Cf-Access-Jwt-Assertion` ヘッダーを読み取り、
`jose` の `createRemoteJWKSet` で Access の JWKS エンドポイント（`https://<team-domain>/cdn-cgi/access/certs`）
から鍵を取得して署名検証します。JWKS の `JWTVerifyGetKey` インスタンスはモジュールスコープでキャッシュされ、
以降のリクエストでは鍵の再フェッチを行いません（初回のみ外部通信が発生する）。

`src/middleware.ts` はこの検証を行わず、`NextResponse.next()` で素通りします。Access JWT の検証は
JWKS フェッチを伴うため、全リクエストで走る middleware ではなく、identity を実際に必要とする
server component / route handler 層（`getAccessIdentity()`）でのみ検証します。

### 開発環境でのフォールバック

`isDevFallbackAllowed()`（`src/lib/auth/environment.ts`）が true のときだけ、
`Cf-Access-Jwt-Assertion` ヘッダーが無い場合に `DEV_ACCESS_EMAIL` から擬似 identity（`sub: 'dev-user'`）を返します。
`isDevFallbackAllowed()` は fail-closed で、`NODE_ENV === 'development'` または `NEXTJS_ENV === 'development'` のときのみ true です。
`NODE_ENV` 未設定の Cloudflare Workers などでは誤って有効化されません。
`resolveDevIdentity()` はこの判定を通過した場合に限り `DEV_ACCESS_EMAIL` を参照します。

### パスワードハッシュ / MFA

パスワード管理・MFA は Cloudflare Access が委譲する Identity Provider（Google など）側の責務であり、
本アプリはパスワードやハッシュを一切保持しません。
