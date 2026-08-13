# KeepOn Notes for Claude

このリポジトリのエージェント向けルールの正本は `AGENTS.md` です。

`AGENTS.md` を読み、プロジェクト概要・開発規約・検証ゲート・デバッグ手順に従ってください。プロダクト・セットアップ・構成は `README.md`、層構造や個別規約の詳細は `.claude/rules/` にあります。

## Known Non-Issues

以下は既知の無害な事象です。ユーザーへの報告や修正は不要です。

- **依存の入れ替え直後に IDE 診断が `Cannot find module 'next'` 等を大量に出す**: LSP の古い状態によるノイズ。`pnpm exec tsc --noEmit` の結果を正とする
- **biome バイナリの更新直後に `lint:biome` が一度だけ失敗する**ことがある: 再実行で解消する。連続で失敗する場合のみ調査する
- **headless ブラウザで認証がリダイレクトループする**: 実ブラウザで問題なければ headless 固有の事象として無視してよい（歴史的記述: 2026-08 の Cloudflare Access 移行前は Clerk のリダイレクトループとして観測されていた。`.claude/rules/troubleshooting.md` 参照）
