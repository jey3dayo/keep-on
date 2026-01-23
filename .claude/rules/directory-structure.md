---
paths: "src/**/*.{ts,tsx}"
---

# ディレクトリ構造と責務定義

## 概要

このドキュメントでは、プロジェクトのディレクトリ構造と各ディレクトリの責務を定義します。

## ディレクトリ構造

```text
src/
├── app/              # Next.js App Router
│   ├── actions/      # Server Actions（Result.tryでエラーハンドリング）
│   ├── api/          # API Routes
│   └── [routes]/     # ページ・レイアウト
├── components/       # React Components
│   ├── Button.tsx    # 汎用UIコンポーネント（ルート直下）
│   └── [feature]/    # 機能別グループ（habits/, auth/など）
├── lib/
│   ├── db.ts         # Prisma Client インスタンス（唯一）
│   ├── queries/      # Prisma操作（生の返り値のみ）
│   ├── errors/       # エラー型定義
│   └── utils.ts      # ユーティリティ関数
├── schemas/          # Zodスキーマ定義（純粋なスキーマのみ）
├── validators/       # バリデーション（Result型を返す）
└── generated/        # 自動生成ファイル（編集禁止）
```

## 各ディレクトリの責務

### `src/schemas/`

**責務:** Zodスキーマ定義

- 純粋なZodスキーマの定義のみを行う
- ビジネスロジックやデータアクセスを含めない
- 型推論（`z.infer<typeof Schema>`）用の型をエクスポート

**返り値の型:** `z.ZodType` + 推論型

**例:**

```typescript
import { z } from "zod";

export const HabitInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  emoji: z.string().nullable().optional(),
});

export type HabitInputSchemaType = z.infer<typeof HabitInputSchema>;
```

### `src/lib/queries/`

**責務:** Prismaデータアクセス

- **生のPrisma操作のみ**を行う
- Result.try などのエラーハンドリングは含めない
- 外部ライブラリ（Clerk等）への依存を排除
- 引数は抽出済みデータのみを受け取る（テスト容易性の確保）

**返り値の型:** 生のPrisma返り値のみ（Promise<T>）

**例:**

```typescript
import { prisma } from "@/lib/db";

interface UpsertUserInput {
  clerkId: string;
  email: string;
}

export async function upsertUser(input: UpsertUserInput) {
  return await prisma.user.upsert({
    where: { clerkId: input.clerkId },
    update: { email: input.email, updatedAt: new Date() },
    create: { clerkId: input.clerkId, email: input.email },
  });
}

export async function createHabit(input: HabitInput) {
  return await prisma.habit.create({ data: input });
}
```

### `src/validators/`

**責務:** バリデーションロジック

- FormDataやリクエストボディのバリデーション
- `src/schemas/` のZodスキーマを使用
- バリデーション結果を `Result<T, E>` 型で返す

**返り値の型:** `Result<T, E>` (byethrow)

**例:**

```typescript
import { Result } from "@praha/byethrow";
import { HabitInputSchema } from "@/schemas/habit";
import { ValidationError } from "@/lib/errors/habit";

export function validateHabitInput(
  userId: string,
  formData: FormData,
): Result.Result<HabitInput, ValidationError> {
  const name = formData.get("name");
  const emoji = formData.get("emoji");

  const parseResult = HabitInputSchema.safeParse({
    name,
    emoji: emoji || null,
  });

  if (!parseResult.success) {
    return Result.fail(
      new ValidationError({
        /* ... */
      }),
    );
  }

  return Result.succeed({ userId, ...parseResult.data });
}
```

### `src/app/actions/`

**責務:** Server Actions

- クライアントから呼び出される Server Action の定義
- 認証チェック、バリデーション、データアクセスを組み合わせる
- `Result.try` でエラーハンドリング
- `revalidatePath` などのNext.js機能を使用

**返り値の型:** `Promise<Result.ResultAsync<T, E>>`

**例:**

```typescript
"use server";

import { Result } from "@praha/byethrow";
import { revalidatePath } from "next/cache";
import { createHabit } from "@/lib/queries/habit";
import { validateHabitInput } from "@/validators/habit";
import { DatabaseError } from "@/lib/errors/habit";

export async function createHabitAction(formData: FormData) {
  const userIdResult = await authenticateUser();

  const dbResult = await Result.pipe(
    userIdResult,
    Result.andThen((userId) => validateHabitInput(userId, formData)),
    Result.andThen(async (validInput) => {
      return await Result.try({
        try: async () => await createHabit(validInput),
        catch: (error) => new DatabaseError({ cause: error }),
      })();
    }),
  );

  if (Result.isSuccess(dbResult)) {
    revalidatePath("/dashboard");
  }

  return dbResult;
}
```

## 設計原則

### 1. 関心の分離

各層は明確に分離され、以下の責務を持つ：

- **schemas**: データ構造の定義
- **validators**: 入力データの検証
- **queries**: データアクセス
- **actions**: ビジネスロジックの統合

### 2. テスト容易性

- **queries** は外部ライブラリに依存しない純粋な関数として設計
- 引数は抽出済みデータのみを受け取る
- モックが容易で単体テストが書きやすい

### 3. エラーハンドリング

- **queries** はエラーをthrowするかPrismaの生の返り値を返す
- **actions** で Result.try を使ってエラーをキャッチし、適切なエラー型に変換

### 4. 依存の方向

```text
actions → validators → schemas
   ↓
queries → db
```

- 上位層から下位層への一方向の依存
- 循環参照を避ける
- 各層は下位層の実装詳細を知らない

## コンポーネント配置

### 汎用コンポーネント

汎用的なUIコンポーネント（Button, Input, Card など）は `src/components/` 直下に配置：

```text
src/components/
├── Button.tsx
├── Input.tsx
└── Card.tsx
```

### 機能別コンポーネント

特定の機能に紐づくコンポーネントは機能別ディレクトリに配置：

```text
src/components/
├── habits/
│   ├── HabitCard.tsx
│   ├── HabitForm.tsx
│   └── HabitList.tsx
└── auth/
    ├── SignInForm.tsx
    └── SignUpForm.tsx
```

## 自動生成ファイル

`src/generated/` 配下のファイルは自動生成されるため、**直接編集しない**：

```text
src/generated/
└── prisma/          # Prisma Client（自動生成）
```

生成コマンド: `pnpm db:generate`
