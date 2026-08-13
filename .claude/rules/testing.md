# 認証テストガイド（Cloudflare Access）

## 概要

このリポジトリの認証は Clerk から Cloudflare Access（Google ログイン）へ移行済み（2026-08）。
以下は現時点の運用方針のメモ。

## 手動テスト

- 保護ルート（`/dashboard` など）にアクセスすると Cloudflare Access のログイン画面にリダイレクトされる
- Google アカウントでログインし、Access のポリシーに従って認可される
- ローカル開発（`pnpm dev`）では Access の前段がないため、`DEV_ACCESS_EMAIL` 等の開発用フォールバックで認証状態を模擬する（詳細は `src/schemas/env.ts` のコメント参照）

## 自動 E2E テスト

- 現状、認証が必要なフローの自動 E2E は未整備
- 今後は Access の **service token** 方式（`CF-Access-Client-Id` / `CF-Access-Client-Secret` ヘッダー）で、Playwright から非対話的に認可させる方式を整備する予定
- 認証不要なページ（`/health` など）のスモークテストは引き続き Playwright で実行可能

## agent-browser でのデバッグ

- `pnpm exec tsx scripts/agent-browser-playwright.ts [URL]` でリモートデバッグ有効な Chrome を起動できる
- Cloudflare Access の認証は実ブラウザの既存セッション前提。未ログインの場合は起動後のブラウザで手動ログインする

## 参考

- [Cloudflare Access ドキュメント](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [Access Service Tokens](https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/)
