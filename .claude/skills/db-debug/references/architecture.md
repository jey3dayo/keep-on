# DB アーキテクチャ リファレンス

## DB 接続

### 現在: Cloudflare D1 (SQLite)

**ファイル:** `src/lib/db.ts`

```text
getCloudflareContext() → env.DB (D1Database) → drizzle(d1Database, { schema })
```

- モジュールレベルのシングルトン (`cachedDb`)
- TCP 接続プールは不要（D1 バインディング経由）
- `resetDb()` で `cachedDb = null` → 次回呼び出し時に再初期化

### レガシー: PostgreSQL (postgres-js) 定数

`src/constants/db.ts` に残存（D1 移行後は未使用の可能性あり）:

| 定数                     | 値     | 用途                     |
| ------------------------ | ------ | ------------------------ |
| `DB_CONNECTION_POOL_MAX` | 2      | プール最大サイズ         |
| `DB_IDLE_TIMEOUT`        | 5秒    | アイドル接続タイムアウト |
| `DB_CONNECT_TIMEOUT`     | 3秒    | 接続タイムアウト         |
| `DB_MAX_LIFETIME`        | 30秒   | 接続最大生存時間         |
| `DB_STATEMENT_TIMEOUT`   | 5000ms | クエリタイムアウト       |

## リトライアーキテクチャ

### 1. `withDbRetry()` — 汎用リトライ

**ファイル:** `src/lib/db-retry.ts`

```text
withDbRetry(name, fn, { maxRetries=1, retryOn=isDatabaseError, timeoutMs })
  ├─ 成功 → 結果を返す
  ├─ isDatabaseError → resetDb() + リトライ (最大2回)
  ├─ それ以外 → 即座に throw
  └─ timeoutMs指定時 → logSpan でラップ (リトライループ全体に適用)
```

**使用箇所:** Dashboard ページの habits/checkins 取得

### 2. Server Action の `runWithRetry` — タイムアウト特化

**ファイル:** `src/app/actions/habits/checkin.ts`, `remove-checkin.ts`

```text
runWithRetry(spanName, fn, { dbTimeoutMs })
  ├─ logSpan(name, fn, { timeoutMs: dbTimeoutMs })
  ├─ TimeoutError → resetDb() + 1回リトライ
  └─ それ以外 → throw (リトライしない)
```

**特徴:** タイムアウトのみリトライ。DB エラー全般はリトライしない。

### 3. `fetchExistingUserWithRetry()` — PostgreSQL コード特化

**ファイル:** `src/lib/user.ts`

```text
fetchExistingUserWithRetry(clerkId, dbTimeoutMs)
  ├─ getUserByClerkId()
  ├─ getRetryableDbReason(error) でリトライ判定
  │   ├─ timeout, ECONNRESET, 57P01, 57014, 53300, 55P03 → リトライ
  │   └─ null → throw
  └─ resetDb() + 1回リトライ
```

## タイムアウト階層

**ファイル:** `src/constants/request-timeout.ts`

```text
requestTimeoutMs (8000ms / Cloudflare: 15000ms)
  └─ dbTimeoutMs = max(3000, min(8000, requestTimeoutMs - 2000))
       └─ 個別クエリ span の timeoutMs
```

リクエスト全体のタイムアウトから2秒のバッファを引いて DB タイムアウトを算出。
最低3秒、最大8秒。

## Stale Cache フォールバック

**使用箇所:** Dashboard ページ、HabitTable

```typescript
try {
  habits = await withDbRetry('dashboard.habits', () => getHabitsWithProgress(...), { timeoutMs })
} catch (error) {
  if (staleHabits && (isTimeoutError(error) || isDatabaseError(error))) {
    habits = staleHabits  // キャッシュ済みデータで応答
  } else {
    throw error
  }
}
```

`logSpanOptional` はタイムアウト時に `null` を返す（非必須データ用）。

## 関連ファイル一覧

| ファイル                            | 役割                                     |
| ----------------------------------- | ---------------------------------------- |
| `src/lib/db.ts`                     | DB 接続 (D1 バインディング)              |
| `src/lib/db-retry.ts`               | 汎用リトライ (`withDbRetry`)             |
| `src/lib/logging.ts`                | ログ・タイムアウト (`logSpan`)           |
| `src/lib/user.ts`                   | ユーザー同期リトライ                     |
| `src/lib/errors/db.ts`              | `extractDbErrorInfo()`                   |
| `src/schemas/db.ts`                 | エラー分類 (`classifyConnectionError`)   |
| `src/schemas/logging.ts`            | エラーフォーマット (`formatErrorObject`) |
| `src/constants/db.ts`               | DB 接続定数                              |
| `src/constants/request-timeout.ts`  | リクエストタイムアウト定数               |
| `src/constants/retry.ts`            | リトライ定数                             |
| `src/app/actions/habits/checkin.ts` | チェックイン Server Action               |
| `src/lib/queries/profiler.ts`       | クエリプロファイラ (100ms 警告)          |
