# ログパターン リファレンス

## ログフォーマット

`logSpan` / `logInfo` / `logError` の出力形式:

```text
<name>:<suffix> {"key":"value","ms":123}
```

例:

```text
query.createCheckinWithLimit:start {"habitId":"abc"}
query.createCheckinWithLimit:end {"habitId":"abc","ms":45}
query.createCheckinWithLimit:error {"habitId":"abc","ms":45,"error":{"name":"PostgresError","message":"duplicate key...","code":"23505"}}
```

## `formatErrorObject()` の出力フィールド

**基本フィールド（常に存在）:**

| フィールド | 説明             |
| ---------- | ---------------- |
| `name`     | エラー名         |
| `message`  | エラーメッセージ |

**DB エラー時の追加フィールド（存在する場合のみ）:**

| フィールド        | 説明                        | 例                            |
| ----------------- | --------------------------- | ----------------------------- |
| `code`            | SQLSTATE コード             | `23505`                       |
| `severity`        | エラー深刻度                | `ERROR`                       |
| `detail`          | 詳細メッセージ              | `Key (id)=...`                |
| `hint`            | ヒント                      | 稀                            |
| `constraint_name` | 違反した制約名              | `Checkin_habitId_date_unique` |
| `table_name`      | 対象テーブル名              | `Checkin`                     |
| `column_name`     | 対象カラム名                | 稀                            |
| `schema_name`     | スキーマ名                  | `public`                      |
| `routine`         | PostgreSQL 内部ルーチン名   | 稀                            |
| `query`           | SQL 文（200文字で切り詰め） | `INSERT INTO...`              |
| `cause`           | 原因（1レベルのみ）         | `{ message, code }`           |

**セキュリティ:** `parameters` / `args` はログに含まれない。

## 典型的なログパターン

### 正常系

```text
dashboard.habits:start {}
dashboard.habits:end {"ms":120}
```

### タイムアウト

```text
dashboard.habits:start {}
dashboard.habits:timeout {"ms":8000}
dashboard.habits:late-error {"error":{"name":"Error","message":"connection terminated"}}
```

`:timeout` 後に `:late-error` が出る場合、本来のエラー原因を `:late-error` で確認できる。

### リトライ成功

```text
dashboard.habits:start {}
dashboard.habits:retry {"attempt":1,"maxRetries":1,"error":{"name":"Error","message":"ECONNRESET"}}
dashboard.habits:end {"ms":350}
```

### リトライ失敗

```text
dashboard.habits:start {}
dashboard.habits:retry {"attempt":1,"maxRetries":1,"error":{"name":"Error","message":"ECONNRESET"}}
dashboard.habits:final-failure {"attempt":2,"maxRetries":1,"error":{"name":"Error","message":"ECONNRESET"}}
```

### 制約違反（リトライなし）

```text
query.createCheckinWithLimit:error {"habitId":"abc","ms":45,"error":{"name":"PostgresError","message":"duplicate key...","code":"23505","constraint_name":"Checkin_habitId_date_unique","table_name":"Checkin"}}
```

### 遅いクエリ

```text
query.getHabitsWithProgress:slow {"ms":150}
```

プロファイラ (`src/lib/queries/profiler.ts`) が 100ms 超で警告。

## Cloudflare Workers ログ

### 監視開始

```bash
pnpm cf:logs
# または
dotenvx run -- wrangler tail --format pretty
```

### 確認ポイント

- `request.dashboard:start` / `:end` が出るか（リクエスト処理の開始・終了）
- `:timeout` / `TimeoutError` が出ていないか
- `db.connection` が毎リクエストで出続けないか（過剰再接続）
- `Clerk: Refreshing the session token resulted in an infinite redirect loop` → Clerk キー不整合
