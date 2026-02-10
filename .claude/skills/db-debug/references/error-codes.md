# DB エラーコード リファレンス

## PostgreSQL エラーコード

`getRetryableDbReason()` (`src/lib/user.ts`) がカバーするコード:

| コード  | 名前                  | 分類       | リトライ | 対処法                                            |
| ------- | --------------------- | ---------- | -------- | ------------------------------------------------- |
| `57P01` | admin_shutdown        | connection | Yes      | DB 再起動待ち。自動リトライで復帰するか確認       |
| `57014` | query_canceled        | timeout    | Yes      | statement_timeout 発火。クエリ最適化 or 上限緩和  |
| `53300` | too_many_connections  | connection | Yes      | 接続プール設定を確認。Hyperdrive の同時接続上限   |
| `55P03` | lock_not_available    | connection | Yes      | ロック競合。同時 insert/update の頻度を下げる     |
| `23505` | unique_violation      | constraint | No       | 一意制約違反。ログの `constraint_name` で特定可能 |
| `23503` | foreign_key_violation | constraint | No       | 外部キー違反。参照先レコードの存在を確認          |
| `42P01` | undefined_table       | schema     | No       | テーブル未定義。マイグレーション漏れの可能性      |

### SQLSTATE クラス分類

| クラス | 意味                 | 例           |
| ------ | -------------------- | ------------ |
| 23xxx  | 整合性制約違反       | 23505, 23503 |
| 42xxx  | 構文・アクセスルール | 42P01        |
| 53xxx  | リソース不足         | 53300        |
| 55xxx  | オブジェクト未準備   | 55P03        |
| 57xxx  | オペレータ介入       | 57P01, 57014 |

## TCP/ネットワークレベルのエラー

`classifyConnectionError()` (`src/schemas/db.ts`) が分類:

| コード            | 分類       | 意味                 | 対処法                             |
| ----------------- | ---------- | -------------------- | ---------------------------------- |
| `ETIMEDOUT`       | timeout    | TCP 接続タイムアウト | ネットワーク遅延 or DB 負荷を確認  |
| `ESOCKETTIMEDOUT` | timeout    | ソケットタイムアウト | 同上                               |
| `ECONNREFUSED`    | network    | 接続拒否             | DB が起動しているか確認            |
| `ENOTFOUND`       | network    | DNS 解決失敗         | DATABASE_URL のホスト名を確認      |
| `EHOSTUNREACH`    | network    | ホスト到達不能       | ネットワーク設定を確認             |
| `ECONNRESET`      | connection | 接続リセット         | DB 側の接続切断。resetDb() で復帰  |
| `EPIPE`           | connection | パイプ破損           | 接続が中断された。自動リトライ対象 |
| `ECONNABORTED`    | connection | 接続中断             | 同上                               |

## D1 (SQLite) 固有のエラー

D1 は Cloudflare バインディング経由でアクセスするため、TCP レベルのエラーは発生しにくい。
代わりに以下のパターンが発生する:

| エラー                          | 原因                      | 対処法                                |
| ------------------------------- | ------------------------- | ------------------------------------- |
| `D1_ERROR`                      | D1 内部エラー             | Cloudflare Status を確認              |
| `SQLITE_CONSTRAINT`             | 制約違反（UNIQUE, FK 等） | constraint 名をログで確認             |
| `D1 database binding not found` | env.DB が未設定           | wrangler.jsonc の d1_databases を確認 |
| `Too many requests`             | D1 レート制限             | リクエスト頻度を下げる                |

### D1 分離レベルの注意

D1 は READ UNCOMMITTED 相当。checkin 等の同時実行では frequency 制限を超える可能性がある。
UI 側の debounce で緩和する設計（`src/app/actions/habits/checkin.ts` コメント参照）。

## エラーコードの確認方法

`formatErrorObject()` の拡張により、ログに以下のフィールドが出力される:

```json
{
  "name": "PostgresError",
  "message": "duplicate key value violates unique constraint",
  "code": "23505",
  "severity": "ERROR",
  "constraint_name": "Checkin_habitId_date_unique",
  "table_name": "Checkin"
}
```

`code` フィールドで上記のテーブルを参照し、原因と対処法を特定する。
