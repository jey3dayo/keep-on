---
paths: "src/**/*.{ts,tsx}"
---

# コードスタイルと開発規約

## ディレクトリ構造規約

プロジェクトの標準的なディレクトリ構成:

- `src/app/` - App Router ページ・レイアウト・Server Actions
- `src/lib/` - ユーティリティ・DB接続・データアクセス
- `src/components/` - 共有コンポーネント
- `src/schemas/` - Valibotスキーマ定義
- `src/validators/` - バリデーションロジック
- `src/db/` - Drizzle ORM スキーマ定義
- `drizzle/` - マイグレーションファイル（自動生成）
- `public/` - 静的アセット・PWAファイル

詳細なディレクトリ構造と責務定義は `.claude/rules/directory-structure.md` を参照してください。

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

### 3. Drizzle DB インスタンスは `src/lib/db.ts` 経由でアクセス

Drizzle DB インスタンスは必ず `src/lib/db.ts` の `getDb()` 関数を使用してください。

**正しい使い方:**

```tsx
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const db = await getDb();
const userList = await db.select().from(users).where(eq(users.id, userId));
```

**誤った使い方:**

```tsx
// ❌ 直接インスタンス化しない
import { drizzle } from "drizzle-orm/postgres-js";
const db = drizzle(...);
```

#### データベース接続のベストプラクティス

**接続プールの管理:**

- `getDb()` は内部で接続プールを管理し、自動的にリトライを実行
- グローバルシングルトンパターンで接続を共有
- Cloudflare Workers環境では最大2接続（並行RSCリクエスト対応）

**エラーハンドリング:**

```tsx
// ✅ getDb() が自動的にリトライとエラー分類を処理
try {
  const db = await getDb();
  const result = await db.select().from(users);
} catch (error) {
  // 接続エラーは既にリトライ済み
  // ここでは最終的な失敗のみ処理
}
```

**タイムアウト制御:**

- クエリタイムアウト: 5秒（`DB_STATEMENT_TIMEOUT`）
- 接続タイムアウト: 3秒（`DB_CONNECT_TIMEOUT`）
- アイドルタイムアウト: 5秒（`DB_IDLE_TIMEOUT`）

設定変更は `src/constants/db.ts` で一元管理されています。

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

### 5. 定数は `src/constants/` で一元管理

マジックナンバーや設定値は定数として抽出し、`src/constants/` で管理してください。

**定数ファイルの配置:**

- `src/constants/db.ts` - データベース接続設定
- `src/constants/cache.ts` - キャッシュ設定
- `src/constants/habit.ts` - 習慣関連の定数
- `src/constants/habit-data.ts` - 習慣関連の静的データ

**良い例:**

```tsx
// src/constants/db.ts
export const DB_CONNECTION_POOL_MAX = 2;
export const DB_IDLE_TIMEOUT = 5;
export const DB_STATEMENT_TIMEOUT = 5000;

// src/lib/db.ts
import { DB_CONNECTION_POOL_MAX, DB_IDLE_TIMEOUT } from "@/constants/db";

const client = postgres(connectionString, {
  max: DB_CONNECTION_POOL_MAX,
  idle_timeout: DB_IDLE_TIMEOUT,
});
```

**悪い例:**

```tsx
// ❌ ハードコードされた値
const client = postgres(connectionString, {
  max: 2, // この2は何を意味する？
  idle_timeout: 5, // なぜ5秒？
});
```

### 6. Edge Runtime の制約を考慮

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
