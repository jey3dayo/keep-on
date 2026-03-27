# シェルスクリプト共通ライブラリ

`scripts/lib/common.sh` は、プロジェクト内のシェルスクリプトで共通して使用される機能を提供します。

## 使い方

スクリプトの冒頭で以下を追加：

```bash
#!/usr/bin/env bash
set -euo pipefail

# 共通ライブラリを読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"
```

### 推奨設定

スクリプトの先頭で以下を設定することを推奨します：

```bash
set -euo pipefail
```

- `-e`: コマンドが失敗したら即座に終了
- `-u`: 未定義の変数を参照したらエラー
- `-o pipefail`: パイプライン内のコマンドが失敗したら終了

## 提供される機能

### カラー定義

スクリプト内で色付き出力を使用できます：

- `RED` - エラーメッセージ用
- `GREEN` - 成功メッセージ用
- `YELLOW` - 警告メッセージ用
- `BLUE` - 情報メッセージ用
- `NC` - No Color（色をリセット）

#### TTY自動検出（改善機能）

カラー出力は自動的にTTY検出されます：

- 対話環境（ターミナル）: 色が有効
- 非対話環境（CI、パイプ、ファイルリダイレクト）: 色が無効

色を強制的に無効化する場合は `NO_COLOR` 環境変数を設定：

```bash
NO_COLOR=1 ./script.sh
```

##### 使用例

```bash
echo -e "${GREEN}成功しました${NC}"
echo -e "${RED}エラーが発生しました${NC}"

# パイプやリダイレクトでは色コードが自動的に削除される
./script.sh | tee log.txt  # log.txtに色コードが混入しない
```

### 出力関数

#### `error "message" [exit_code]`

エラーメッセージを表示して終了します。

- 引数:
  - `message`: エラーメッセージ
  - `exit_code`: 終了コード（省略時: 1）
- 出力先: stderr

##### 使用例

```bash
error "ファイルが見つかりません"
error "処理に失敗しました" 2
```

#### `success "message"`

成功メッセージを表示します。

- 引数: `message` - 成功メッセージ
- 出力先: stdout

##### 使用例

```bash
success "処理が完了しました"
success "ファイルを作成しました: output.txt"
```

#### `warn "message"`

警告メッセージを表示します。

- 引数: `message` - 警告メッセージ
- 出力先: stdout

##### 使用例

```bash
warn "設定が見つかりません。デフォルト値を使用します"
warn "古いバージョンが検出されました"
```

#### `info "message"`

情報メッセージを表示します。

- 引数: `message` - 情報メッセージ
- 出力先: stdout

##### 使用例

```bash
info "処理を開始しています..."
info "ダウンロード中: 50%"
```

### ユーティリティ関数

#### `check_env "VAR_NAME"`

環境変数が設定されているかチェックします。未設定の場合はエラーで終了します。

- 引数: `VAR_NAME` - チェックする環境変数名

##### 使用例

```bash
check_env "API_KEY"
check_env "DATABASE_URL"

# 以降で安全に使用可能
echo "API Key: $API_KEY"
```

#### `get_project_root`

プロジェクトルートディレクトリの絶対パスを返します。

- 戻り値: プロジェクトルートの絶対パス

##### 使用例

```bash
PROJECT_ROOT=$(get_project_root)
cd "$PROJECT_ROOT"

# 相対パスで参照
CONFIG_FILE="${PROJECT_ROOT}/config/settings.json"
```

### エラートラップとクリーンアップ（改善機能）

#### `register_cleanup "function_name"`

クリーンアップ関数を登録します。スクリプト終了時（正常終了、エラー、割り込み）に自動実行されます。

- 引数: `function_name` - 実行するクリーンアップ関数名
- 実行タイミング: `EXIT`, `ERR`, `INT`, `TERM` シグナル時
- 実行順序: LIFO（後に登録したものから先に実行）

##### 使用例

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# 一時ファイルを作成
TEMP_FILE=$(mktemp)

# クリーンアップ関数を定義
cleanup_temp_file() {
  if [[ -f "$TEMP_FILE" ]]; then
    rm -f "$TEMP_FILE"
    info "一時ファイルを削除しました"
  fi
}

# クリーンアップを登録
register_cleanup cleanup_temp_file

# 処理（エラーが発生しても自動的にクリーンアップされる）
process_data > "$TEMP_FILE"

# 正常終了時もクリーンアップが実行される
```

#### 複数のクリーンアップ関数

```bash
cleanup_db() {
  info "データベース接続をクローズします"
  close_db_connection
}

cleanup_lock() {
  rm -f "/var/lock/myapp.lock"
}

# 複数登録可能（後に登録したものから実行される）
register_cleanup cleanup_db
register_cleanup cleanup_lock  # こちらが先に実行される
```

#### メリット

- 一時ファイルの削除漏れを防止
- ロックファイルの確実な削除
- エラー発生時も確実にリソース解放
- 複数のクリーンアップ処理を安全に管理

## 実装例

### 基本的な使用例

```bash
#!/usr/bin/env bash
set -euo pipefail

# 共通ライブラリを読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# 必須環境変数のチェック
check_env "API_TOKEN"

# プロジェクトルートを取得
PROJECT_ROOT=$(get_project_root)
cd "$PROJECT_ROOT"

# 処理開始
info "処理を開始します..."

# 成功時
success "処理が完了しました"

# エラー時
if [[ ! -f "required-file.txt" ]]; then
  error "必須ファイルが見つかりません"
fi
```

### エラーハンドリング例

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# 条件付き警告
if [[ ! -f ".env" ]]; then
  warn ".env ファイルが見つかりません。デフォルト設定を使用します"
fi

# 複数の環境変数チェック
for var in API_KEY DATABASE_URL SECRET_TOKEN; do
  check_env "$var"
done

# 処理実行
if process_data; then
  success "データ処理が完了しました"
else
  error "データ処理に失敗しました" 1
fi
```

### クリーンアップ機能を使った例（改善機能）

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# 一時ディレクトリを作成
WORK_DIR=$(mktemp -d)
info "作業ディレクトリ: $WORK_DIR"

# クリーンアップ関数を定義
cleanup_work_dir() {
  if [[ -d "$WORK_DIR" ]]; then
    rm -rf "$WORK_DIR"
    info "作業ディレクトリを削除しました"
  fi
}

# クリーンアップを登録（エラー時も自動実行）
register_cleanup cleanup_work_dir

# 処理実行（エラーが発生してもクリーンアップされる）
cd "$WORK_DIR"
download_files
process_files
upload_results

success "すべての処理が完了しました"
# スクリプト終了時に自動的に cleanup_work_dir が実行される
```

## 対応スクリプト

以下のスクリプトがこの共通ライブラリを使用しています：

### 高優先度

- `setup-cloudflare-secrets.sh`
- `setup-cloudflare-secrets-bulk.sh`
- `setup-auth-state.sh`
- `debug-session.sh`

### 中優先度

- `get-workers-metrics.sh`
- `setup-cloudflare-alerts.sh`
- `generate-secrets-json.sh`

### 低優先度

- `debug-chrome.sh`
- `open-login.sh`
- `update-mcp-chrome.sh`

## トラブルシューティング

### `source: no such file or directory`

#### 原因

#### 解決方法

```bash
# 正しい設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"
```

### `permission denied`

#### 原因

#### 解決方法

```bash
chmod +x scripts/your-script.sh
```

### カラー出力が表示されない

#### 原因

#### 対処

- カラー対応ターミナルを使用
- リダイレクトする場合は色付き出力は無効化される（仕様）

## ベストプラクティス

1. エラーチェックを早期に実行

   スクリプトの最初に `check_env` で必須環境変数をチェック

2. 適切な終了コードを使用

   `error` 関数の第2引数で意味のある終了コードを指定

3. ユーザーに適切なフィードバック

   処理の進行状況を `info`, 成功を `success`, 警告を `warn` で表示

4. プロジェクトルートを基準にパスを指定

   `get_project_root` を使用して相対パスの問題を回避

## 拡張

今後、以下の機能を追加する可能性があります：

- `debug()` 関数（`DEBUG=1` 時のみ表示）
- `require_command()` 関数（必須コマンドの確認）
- `confirm()` 関数（ユーザー確認のプロンプト）
- `spinner()` 関数（処理中のアニメーション）

## 参考リンク

- [Bash スタイルガイド](https://google.github.io/styleguide/shellguide.html)
- [シェルスクリプトのベストプラクティス](https://github.com/progrium/bashstyle)
