---
paths: "src/**/*.{ts,tsx}"
---

# コードスタイルと開発規約

## ディレクトリ構造規約

プロジェクトの標準的なディレクトリ構成:

- `src/app/` - App Router ページ・レイアウト
- `src/lib/` - ユーティリティ・DB接続
- `src/components/` - 共有コンポーネント
- `src/generated/prisma/` - Prisma Client（自動生成）
- `prisma/` - スキーマ・マイグレーション
- `public/` - 静的アセット・PWAファイル

## 開発ルール

### 1. Server Components をデフォルトとして使用

Next.js 15 App Router では、すべてのコンポーネントはデフォルトで Server Component として扱われます。
Client Component が必要な場合のみ `"use client"` ディレクティブを使用してください。

**良い例:**
```tsx
// Server Component (デフォルト)
export default function Page() {
  return <div>...</div>;
}
```

**Client Component が必要な場合:**
```tsx
"use client";

export default function InteractiveComponent() {
  const [state, setState] = useState(0);
  return <button onClick={() => setState(state + 1)}>{state}</button>;
}
```

### 2. Clerk の `auth()` はサーバー側でのみ使用

Clerk の `auth()` 関数は Server Components または Server Actions でのみ使用可能です。
Client Components では `useAuth()` フックを使用してください。

**サーバー側:**
```tsx
import { auth } from "@clerk/nextjs/server";

export default async function Page() {
  const { userId } = await auth();
  // ...
}
```

**クライアント側:**
```tsx
"use client";
import { useAuth } from "@clerk/nextjs";

export default function Component() {
  const { userId } = useAuth();
  // ...
}
```

### 3. Prisma Client は `src/lib/db.ts` 経由でアクセス

Prisma Client は必ず `src/lib/db.ts` でエクスポートされたインスタンスを使用してください。
直接 `new PrismaClient()` をインスタンス化しないでください。

**正しい使い方:**
```tsx
import { prisma } from "@/lib/db";

const users = await prisma.user.findMany();
```

**誤った使い方:**
```tsx
// ❌ 直接インスタンス化しない
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
```

### 4. 環境変数の機密情報は dotenvx で暗号化

機密情報を含む環境変数は `.env` ファイルに平文で保存せず、dotenvx で暗号化してください。

**暗号化:**
```bash
pnpm env:encrypt
```

**復号して実行:**
```bash
pnpm env:run -- pnpm dev
```

### 5. Edge Runtime の制約を考慮

Cloudflare Workers 環境では Node.js 固有 API が使用できません。
Edge Runtime 互換のコードのみを使用してください。

**使用不可:**
- `fs` (ファイルシステム)
- `path` (Node.js の path モジュール)
- `crypto` (Node.js の crypto モジュール)
- その他の Node.js 組み込みモジュール

**代替手段:**
- Web標準APIを使用（Fetch API, Web Crypto API など）
- Edge Runtime 互換のライブラリを選択
