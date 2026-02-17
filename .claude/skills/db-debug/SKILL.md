---
name: db-debug
description: |
  [What] KeepOn の DB エラー診断・デバッグナレッジベース。エラー分類、リトライ挙動、ログ解析パターンをカバー。
  [When] Use when: DB エラーの調査、クエリタイムアウト、接続障害、ログ解析、リトライ挙動の理解が必要な時。
  [Keywords] database, db, error, timeout, retry, connection, D1, SQLite, PostgreSQL, log, debug, query
---

# DB Debug Skill

KeepOn の DB エラー診断ナレッジベース。
D1(SQLite) / PostgreSQL エラーの分類、リトライ挙動、ログパターンの読み方をカバーする。

## エラー分類クイックリファレンス

`classifyConnectionError()` (`src/schemas/db.ts`) による5分類:

| 分類         | トリガー                                            | リトライ |
| ------------ | --------------------------------------------------- | -------- |
| `timeout`    | ETIMEDOUT, ESOCKETTIMEDOUT, "timeout", "timed out"  | Yes      |
| `network`    | ECONNREFUSED, ENOTFOUND, EHOSTUNREACH, "host","dns" | Yes      |
| `connection` | ECONNRESET, EPIPE, ECONNABORTED, "terminated"       | Yes      |
| `auth`       | "authentication", "password", "login"               | No       |
| `unknown`    | 上記以外                                            | No       |

`isDatabaseError()` は timeout / network / connection を `true` と判定しリトライ対象とする。

## ログ命名規則

`logSpan` が出力するサフィックス:

| サフィックス     | 意味                            |
| ---------------- | ------------------------------- |
| `:start`         | 処理開始                        |
| `:end`           | 正常完了（`ms` フィールド付き） |
| `:error`         | エラー発生                      |
| `:timeout`       | タイムアウト発火                |
| `:late-error`    | タイムアウト後の遅延エラー      |
| `:retry`         | リトライ実行                    |
| `:final-failure` | 全リトライ失敗                  |
| `:slow`          | 100ms 超のクエリ警告            |

エラーログの `error` フィールドには `formatErrorObject()` の出力が入る。
DB エラーの場合、`code`, `severity`, `constraint_name`, `table_name`, `cause` 等が追加される。

## 3層レジリエンス

```text
1. withDbRetry     → DB エラー時に resetDb() + リトライ (最大2回)
2. Stale cache     → リトライ失敗時にキャッシュ済みデータで応答
3. logSpanOptional → タイムアウト時に null を返し、非必須データをスキップ
```

## 診断フロー

**エラー発生時の切り分け手順:**

1. **ログのサフィックスを確認** → `:timeout` なら タイムアウト階層を確認
2. **error.code を確認** → PostgreSQL コードなら `references/error-codes.md` を参照
3. **`:retry` / `:final-failure` の有無** → リトライが走ったか確認
4. **`:late-error` の有無** → タイムアウト後に本来のエラーが出ていないか確認
5. **Cloudflare ログとの突き合わせ** → `pnpm cf:logs` で Workers ログを監視

## References

- `references/error-codes.md` - PostgreSQL/D1 エラーコード表と対処法
- `references/architecture.md` - DB 接続・リトライ・タイムアウトのアーキテクチャ詳細
- `references/log-patterns.md` - ログフォーマット・Cloudflare/Supabase ログ解析手順
