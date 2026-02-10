# ログパターン リファレンス

## ログフォーマット

`logSpan` / `logInfo` / `logError` の出力形式:

```
<name>:<suffix> {"key":"value","ms":123}
```

例:

```
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

```
dashboard.habits:start {}
dashboard.habits:end {"ms":120}
```

### タイムアウト

```
dashboard.habits:start {}
dashboard.habits:timeout {"ms":8000}
dashboard.habits:late-error {"error":{"name":"Error","message":"connection terminated"}}
```

`:timeout` 後に `:late-error` が出る場合、本来のエラー原因を `:late-error` で確認できる。

### リトライ成功

```
dashboard.habits:start {}
dashboard.habits:retry {"attempt":1,"maxRetries":1,"error":{"name":"Error","message":"ECONNRESET"}}
dashboard.habits:end {"ms":350}
```

### リトライ失敗

```
dashboard.habits:start {}
dashboard.habits:retry {"attempt":1,"maxRetries":1,"error":{"name":"Error","message":"ECONNRESET"}}
dashboard.habits:final-failure {"attempt":2,"maxRetries":1,"error":{"name":"Error","message":"ECONNRESET"}}
```

### 制約違反（リトライなし）

```
query.createCheckinWithLimit:error {"habitId":"abc","ms":45,"error":{"name":"PostgresError","message":"duplicate key...","code":"23505","constraint_name":"Checkin_habitId_date_unique","table_name":"Checkin"}}
```

### 遅いクエリ

```
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

## Supabase Logs でのエラー確認

Cloudflare ログだけで原因が特定できない場合:

```bash
# 環境変数が必要: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN
DOTENV_PRIVATE_KEY=$(rg -N '^DOTENV_PRIVATE_KEY=' .env.keys | cut -d= -f2-) \
dotenvx run -- python3 -c "
import os, urllib.parse, datetime
ref=os.environ['SUPABASE_PROJECT_REF']
base=f'https://api.supabase.com/v1/projects/{ref}/analytics/endpoints/logs.all'
end=datetime.datetime.utcnow().replace(second=0, microsecond=0)
start=end-datetime.timedelta(minutes=90)
sql=\"\"\"
select cast(postgres_logs.timestamp as datetime) as timestamp,
  parsed.error_severity, event_message
from postgres_logs
cross join unnest(metadata) as metadata
cross join unnest(metadata.parsed) as parsed
where regexp_contains(parsed.error_severity, 'ERROR|FATAL|PANIC')
order by timestamp desc limit 50;
\"\"\".strip()
params={'iso_timestamp_start':start.isoformat()+'Z','iso_timestamp_end':end.isoformat()+'Z','sql':sql}
print(base+'?'+urllib.parse.urlencode(params))
"
```

出力された URL を `curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" "<URL>" | jq '.result'` で実行。

### Supabase ログの典型パターン

| エラーメッセージ                                          | 原因                    |
| --------------------------------------------------------- | ----------------------- |
| `unique or exclusion constraint matching the ON CONFLICT` | UNIQUE 制約が存在しない |
| `canceling statement due to statement timeout`            | statement_timeout 発火  |
| `too many connections`                                    | DB 接続上限             |
| `lock not available`                                      | ロック競合              |
