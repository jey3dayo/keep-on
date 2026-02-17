# Prisma → Drizzle ORM 移行完了

## 移行日

2026-01-25

## 背景

Prisma v7 において Cloudflare Workers での WASM サポートに問題が発生したため、Drizzle ORM に移行しました。

## 実施内容

### 1. パッケージ変更

**追加:**

- `drizzle-orm`: ORM本体
- `postgres`: PostgreSQL クライアント（postgres-js）
- `drizzle-kit`: マイグレーションツール
- `@paralleldrive/cuid2`: ID生成ライブラリ

**削除:**

- `@prisma/client`
- `@prisma/adapter-pg`
- `prisma`

### 2. ファイル構造変更

**新規作成:**

- `src/db/schema.ts` - Drizzle スキーマ定義
- `drizzle.config.ts` - Drizzle Kit 設定

**書き換え:**

- `src/lib/db.ts` - Drizzle 接続に変更
- `src/lib/queries/user.ts` - Drizzle クエリに変更
- `src/lib/queries/habit.ts` - Drizzle クエリに変更
- `src/validators/habit.ts` - 型定義を Drizzle 型に変更
- `src/components/habits/HabitListServer.tsx` - 型インポート変更
- `src/lib/queries/__tests__/habit.test.ts` - モック変更
- `src/lib/queries/__tests__/user.test.ts` - モック変更

**削除:**

- `prisma/` ディレクトリ
- `src/generated/prisma/` ディレクトリ
- `scripts/extract-prisma-wasm.mjs`

**更新:**

- `package.json` - スクリプト変更（db:generate, db:push, db:migrate, db:studio）
- `.gitignore` - Prisma → Drizzle に変更
- `.claude/CLAUDE.md` - ドキュメント更新
- `.claude/rules/tech-stack.md` - ドキュメント更新
- `.claude/rules/code-style.md` - ドキュメント更新
- `.claude/rules/directory-structure.md` - ドキュメント更新

### 3. スキーマ定義

Drizzle スキーマ (`src/db/schema.ts`) で以下のテーブルを定義：

- `users`: User テーブル（id, clerkId, email, createdAt, updatedAt）
- `habits`: Habit テーブル（id, userId, name, emoji, createdAt, updatedAt）
- `checkins`: Checkin テーブル（id, habitId, date, createdAt）

リレーション:

- User → Habit (1:N, Cascade)
- Habit → Checkin (1:N, Cascade)

### 4. クエリ API の変更

**Prisma:**

```typescript
await prisma.user.upsert({ where: {...}, update: {...}, create: {...} })
await prisma.habit.findMany({ where: {...}, orderBy: {...} })
await prisma.habit.findUnique({ where: {...} })
await prisma.habit.create({ data: {...} })
```

**Drizzle:**

```typescript
const db = await getDb()
await db.insert(users).values({...}).onConflictDoUpdate({...}).returning()
await db.select().from(habits).where(eq(habits.userId, userId)).orderBy(desc(habits.createdAt))
const [habit] = await db.select().from(habits).where(eq(habits.id, id))
await db.insert(habits).values({...}).returning()
```

### 5. テスト変更

**Prisma モック:**

```typescript
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { upsert: vi.fn() },
    habit: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));
```

**Drizzle モック:**

```typescript
vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
  }),
}));
```

## 検証結果

- [x] 全テスト成功（40 tests passed）
- [x] 型チェック成功
- [x] Lint/Format エラーなし
- [x] Next.js ビルド成功

## 新しいコマンド

```bash
# スキーマからマイグレーション生成
pnpm db:generate

# スキーマを直接DBに同期（dev用）
pnpm db:push

# マイグレーション実行
pnpm db:migrate

# Drizzle Studio起動（GUI）
pnpm db:studio
```

## 参考リンク

- [Drizzle ORM + Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/)
- [Drizzle ORM PostgreSQL](https://orm.drizzle.team/docs/get-started/postgresql-new)
- [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)
