# メジャーアップデート移行計画（アーカイブ）

> このドキュメントは 2026-01-25 の Prisma → Drizzle 移行と Next.js 16 / Wrangler 4 への更新完了に伴いアーカイブしました。
> 現状の構成は README.md と docs/migrations/2026-01-25-prisma-to-drizzle.md を参照してください。

## 現在の構成（package.json 参照）

- Next.js: 16.1.6
- Drizzle ORM: 0.45.1 / drizzle-kit: 0.31.8
- Wrangler: 4.61.1
- @types/node: 25.1.0

## 方針

- 重大な移行は docs/migrations/ に記録する
- 依存更新は影響の大きいものから段階的に実施する
- 実施前に README と差分が出ないように更新する

## 参考

- docs/migrations/2026-01-25-prisma-to-drizzle.md
- README.md
