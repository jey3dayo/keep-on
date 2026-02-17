#!/usr/bin/env bash
# シェルスクリプト共通ライブラリ
#
# 使用方法:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "${SCRIPT_DIR}/lib/common.sh"
#
# 推奨: スクリプトの先頭で以下を設定してください
#   set -euo pipefail
#     -e: コマンドが失敗したら即座に終了
#     -u: 未定義の変数を参照したらエラー
#     -o pipefail: パイプライン内のコマンドが失敗したら終了

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# カラー定義（TTY検出による自動制御）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# カラー変数（グローバル）
RED=''
GREEN=''
YELLOW=''
BLUE=''
NC=''

# TTY検出による色の自動設定
# 非対話環境（CI、パイプ、ファイルリダイレクト）では色を無効化
setup_colors() {
  # NO_COLOR環境変数が設定されている場合は色を無効化
  if [[ -n "${NO_COLOR:-}" ]]; then
    return
  fi

  # 標準出力がTTYの場合のみ色を有効化
  if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
  fi
}

# ライブラリ読み込み時に自動実行
setup_colors

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 出力関数
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# エラーメッセージを表示して終了
# 引数:
#   $1: エラーメッセージ
#   $2: 終了コード（デフォルト: 1）
# 使用例:
#   error "ファイルが見つかりません"
#   error "処理に失敗しました" 2
error() {
  echo -e "${RED}✘ Error: $1${NC}" >&2
  exit "${2:-1}"
}

# 成功メッセージを表示
# 引数:
#   $1: メッセージ
# 使用例:
#   success "処理が完了しました"
success() {
  echo -e "${GREEN}✔ $1${NC}"
}

# 警告メッセージを表示
# 引数:
#   $1: メッセージ
# 使用例:
#   warn "設定が見つかりません。デフォルト値を使用します"
warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# 情報メッセージを表示
# 引数:
#   $1: メッセージ
# 使用例:
#   info "処理を開始しています..."
info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ユーティリティ関数
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 環境変数の存在をチェック
# 引数:
#   $1: 環境変数名
# 使用例:
#   check_env "API_KEY"
#   check_env "DATABASE_URL"
check_env() {
  local var_name=$1
  if [[ -z "${!var_name:-}" ]]; then
    error "環境変数 $var_name が設定されていません"
  fi
}

# プロジェクトルートディレクトリを取得
# 戻り値:
#   プロジェクトルートの絶対パス
# 使用例:
#   PROJECT_ROOT=$(get_project_root)
#   cd "$PROJECT_ROOT"
get_project_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# エラートラップとクリーンアップ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ユーザー定義のクリーンアップ関数を保持する配列
_CLEANUP_FUNCTIONS=()

# クリーンアップ関数を登録
# 引数:
#   $1: クリーンアップ関数名
# 使用例:
#   cleanup() {
#     rm -f /tmp/myfile
#   }
#   register_cleanup cleanup
register_cleanup() {
  local func_name=$1

  # 関数が定義されているか確認
  if ! declare -f "$func_name" > /dev/null; then
    error "クリーンアップ関数 '$func_name' が定義されていません"
  fi

  # 配列に追加
  _CLEANUP_FUNCTIONS+=("$func_name")

  # trap を設定（初回のみ）
  if [[ ${#_CLEANUP_FUNCTIONS[@]} -eq 1 ]]; then
    trap '_common_cleanup' EXIT ERR INT TERM
  fi
}

# 内部: 登録された全てのクリーンアップ関数を実行
_common_cleanup() {
  local exit_code=$?

  # 登録された関数を逆順で実行（LIFO）
  for ((i=${#_CLEANUP_FUNCTIONS[@]}-1; i>=0; i--)); do
    local func="${_CLEANUP_FUNCTIONS[i]}"
    if declare -f "$func" > /dev/null; then
      "$func" || true  # エラーを無視
    fi
  done

  # 元の終了コードで終了
  exit $exit_code
}
