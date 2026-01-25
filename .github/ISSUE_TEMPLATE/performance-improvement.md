---
name: Performance Improvement
about: Cloudflare Workers向けのパフォーマンス改善提案
title: "[PERF] "
labels: performance, cloudflare
assignees: ""
---

## 概要

Cloudflare Workers環境でのバンドルサイズ最適化とパフォーマンス改善

## 背景

Edge環境ではバンドルサイズがコールドスタート時間に直接影響するため、軽量なライブラリへの移行が重要

## 提案内容

### 1. Zod → Valibot への移行

**現状:**

- `@t3-oss/env-nextjs` + `zod` (~14KB)

**改善案:**

- `valibot` (~5KB) への移行
- バンドルサイズ: **-9KB** (約65%削減)

**実装例:**

```typescript
// lib/env.ts
import * as v from "valibot";

const envSchema = v.object({
  DATABASE_URL: v.pipe(v.string(), v.url()),
  CLERK_SECRET_KEY: v.pipe(v.string(), v.minLength(1)),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: v.pipe(v.string(), v.minLength(1)),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: v.pipe(v.string(), v.startsWith("/")),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: v.pipe(v.string(), v.startsWith("/")),
});

export const env = v.parse(envSchema, {
  DATABASE_URL: process.env.DATABASE_URL,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
});
```

**メリット:**

- ✅ Tree-shakable (使用したバリデーターのみ含まれる)
- ✅ Zod同等の型安全性
- ✅ 高速なランタイムパフォーマンス
- ✅ 既存のパターンから移行しやすい

### 2. バンドル分析の追加

**実装:**

```bash
pnpm add -D @next/bundle-analyzer
```

```typescript
// next.config.ts
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer({
  // ... existing config
});
```

**使用:**

```bash
ANALYZE=true pnpm build:cf
```

### 3. 代替案検討

#### Option A: Valibot (推奨)

- バンドルサイズ: ~5KB
- 機能: Zod同等
- 学習コスト: 低

#### Option B: Arktype

- バンドルサイズ: ~3KB
- 文字列ベース定義
- 学習コスト: 中

#### Option C: カスタム実装

- バンドルサイズ: ~0.5KB
- 必要最小限のチェックのみ
- 保守コスト: 高

## タスク

- [ ] Valibot インストール: `pnpm add valibot`
- [ ] `lib/env.ts` を Valibot に移行
- [ ] `@t3-oss/env-nextjs` と `zod` を削除
- [ ] 型チェック確認: `mise run lint`
- [ ] ビルド確認: `pnpm build:cf`
- [ ] バンドルサイズ測定 (before/after)
- [ ] ドキュメント更新: `.claude/rules/tech-stack.md`

## 期待効果

- **バンドルサイズ**: -9KB (約65%削減)
- **コールドスタート時間**: 改善見込み
- **Tree-shaking効果**: さらなる最適化の可能性
- **型安全性**: 維持

## 参考資料

- [Valibot Documentation](https://valibot.dev/)
- [Bundle Size Comparison](https://bundlephobia.com/package/valibot)
- [Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/)
