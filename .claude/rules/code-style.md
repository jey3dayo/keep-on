---
paths:
  - "src/**/*.{ts,tsx}"
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

### 良い例

```tsx
// Server Component (デフォルト)
export default function Page() {
  return <div>...</div>;
}
```

### Client Component が必要な場合

```tsx
"use client";

export default function InteractiveComponent() {
  const [state, setState] = useState(0);
  return <button onClick={() => setState(state + 1)}>{state}</button>;
}
```

### 2. 認証情報の取得はサーバー/クライアントで手段を分ける

サーバー側は `getAccessIdentity()`（`src/lib/auth/access.ts`）で Cloudflare Access JWT を検証します。
Client Components ではサーバー検証済みの identity を `useIdentity()`（`src/contexts/IdentityContext.tsx`）
経由で参照してください。

### サーバー側

```tsx
import { getAccessIdentity } from "@/lib/auth/access";

export default async function Page() {
  const identity = await getAccessIdentity();
  // identity?.sub, identity?.email
  // ...
}
```

### クライアント側

```tsx
"use client";
import { useIdentity } from "@/contexts/IdentityContext";

export default function Component() {
  const { userId } = useIdentity();
  // ...
}
```

### 3. Drizzle DB インスタンスは `src/lib/db.ts` 経由でアクセス

Drizzle DB インスタンスは必ず `src/lib/db.ts` の `getDb()` 関数を使用してください。

### 正しい使い方

```tsx
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const db = getDb();
const userList = await db.select().from(users).where(eq(users.id, userId));
```

### 誤った使い方

```tsx
// ❌ 直接インスタンス化しない
import { drizzle } from "drizzle-orm/d1";
const db = drizzle(...);

// ❌ REMOVED（PostgreSQL 時代）— postgres-js プールは D1 移行で削除済み
import { drizzle } from "drizzle-orm/postgres-js";
const db = drizzle(...);
```

#### データベース接続のベストプラクティス

### D1 シングルトンの管理

- `getDb()` は Cloudflare D1 バインディング経由で Drizzle インスタンスを返す
- モジュールレベルのシングルトン (`cachedDb`) で同一 Worker 内の接続を共有
- TCP 接続プールは不要（D1 はバインディング API 経由）
- 接続リセットが必要なときは `resetDb()` → 次回 `getDb()` で再初期化

### エラーハンドリングとリトライ

```tsx
// ✅ クエリ単位のリトライは withDbRetry / logSpan の timeoutMs を使う
import { withDbRetry } from "@/lib/db-retry";
import { getRequestTimeoutMs } from "@/lib/server/timeout";

const requestTimeoutMs = getRequestTimeoutMs();
const dbTimeoutMs = Math.max(3000, Math.min(8000, requestTimeoutMs - 2000));

const result = await withDbRetry(
  "dashboard.habits",
  () => getHabitsWithProgress(...),
  { timeoutMs: dbTimeoutMs },
);
```

`getDb()` 自体はリトライしない。タイムアウトや一時的 DB エラーは呼び出し側の `withDbRetry` や Server Action 内の `runWithRetry` で処理する。

### タイムアウト制御

- リクエスト全体: 8秒（`DEFAULT_REQUEST_TIMEOUT_MS`）/ Cloudflare 本番: 15秒（`CLOUDFLARE_REQUEST_TIMEOUT_MS`）
- DB クエリ span: `max(3000, min(8000, requestTimeoutMs - 2000))` で算出（リクエスト終了2秒前を上限）

設定変更は `src/constants/request-timeout.ts` で一元管理。算出ロジックは `src/lib/server/timeout.ts` の `getRequestTimeoutMs()` を参照。

### raw SQL（`sql` テンプレート）を使う場合の検証必須ルール

ユニットテストは DB を mock するため、`sql` テンプレートで書いた raw SQL の構文エラーは CI を素通りして本番で初めて発火する（2026-07 に条件付き INSERT の構文エラーで本番チェックインが全滅した実績あり）。

`sql` テンプレートを追加・変更したときは、コミット前に実 SQLite で構文検証すること:

```bash
# ローカル D1 で検証
pnpm wrangler d1 execute <db-name> --local --command "<生成されるSQL>"

# または sqlite3 で最小スキーマを作って検証
sqlite3 :memory: 'CREATE TABLE ...; <生成されるSQL>;'
```

#### SQLite 固有の構文制約（D1 で踏みやすいもの）

- INSERT のカラムリストにテーブル修飾は書けない（`INSERT INTO t ("t"."col")` は構文エラー）。Drizzle の `${table.column}` は完全修飾で展開されるため、カラムリストには使わずリテラルで書く
- RETURNING 句内にサブクエリは書けない

### 4. 環境変数の機密情報は dotenvx で暗号化

機密情報を含む環境変数は `.env` ファイルに平文で保存せず、dotenvx で暗号化してください。

### 暗号化

```bash
pnpm env:encrypt
```

### 復号して実行

```bash
pnpm env:run -- pnpm dev
```

### 5. 定数は `src/constants/` で一元管理

マジックナンバーや設定値は定数として抽出し、`src/constants/` で管理してください。

#### 定数ファイルの配置

- `src/constants/request-timeout.ts` - リクエスト / DB span タイムアウト
- `src/constants/retry.ts` - リトライ回数・遅延
- `src/constants/cache.ts` - キャッシュ設定
- `src/constants/habit.ts` - 習慣関連の定数
- `src/constants/habit-data.ts` - 習慣関連の静的データ

#### 良い例

```tsx
// src/constants/request-timeout.ts
export const DEFAULT_REQUEST_TIMEOUT_MS = 8000;
export const CLOUDFLARE_REQUEST_TIMEOUT_MS = 15_000;

// src/lib/server/timeout.ts
import {
  CLOUDFLARE_REQUEST_TIMEOUT_MS,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from "@/constants/request-timeout";

export function getRequestTimeoutMs(): number {
  // 環境変数 → Cloudflare 本番 → デフォルト の順で解決
}
```

#### 悪い例

```tsx
// ❌ ハードコードされたタイムアウト
const dbTimeoutMs = 5000; // リクエスト上限と整合しない

// ❌ REMOVED（PostgreSQL 時代）— src/constants/db.ts と postgres プール定数は削除済み
const client = postgres(connectionString, { max: 2, idle_timeout: 5 });
```

### 6. Edge Runtime の制約を考慮

Cloudflare Workers 環境では Node.js 固有 API が使用できません。
Edge Runtime 互換のコードのみを使用してください。

### 使用不可

- `fs` (ファイルシステム)
- `path` (Node.js の path モジュール)
- `crypto` (Node.js の crypto モジュール)
- その他の Node.js 組み込みモジュール

### 代替手段

- Web標準APIを使用（Fetch API, Web Crypto API など）
- Edge Runtime 互換のライブラリを選択
