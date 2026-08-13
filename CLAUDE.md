# KeepOn Notes for Claude

ルールの正本は `AGENTS.md`。

## Known Non-Issues（報告・修正不要）

- 依存の入れ替え直後に IDE 診断が `Cannot find module 'next'` を大量に出す → LSP の古い状態。`pnpm exec tsc --noEmit` の結果を正とする
- biome バイナリ更新直後に `lint:biome` が一度だけ失敗する → 再実行で解消。連続失敗時のみ調査
- headless ブラウザで認証がリダイレクトループする → 実ブラウザで問題なければ headless 固有（`.claude/rules/troubleshooting.md`）
