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
├── db/
│   └── schema.ts     # Drizzle ORM スキーマ定義
├── lib/
│   ├── db.ts         # Drizzle DB インスタンス（唯一）
│   ├── queries/      # Drizzle操作（生の返り値のみ）
│   ├── errors/       # エラー型定義
│   ├── habit-data.ts # 習慣関連の静的データ・ヘルパー関数
│   └── utils.ts      # 汎用ユーティリティ関数
├── schemas/          # Valibotスキーマ定義（純粋なスキーマのみ）
└── validators/       # バリデーション（Result型を返す）
```

## 各ディレクトリの責務

### `src/schemas/`

**責務:** Valibotスキーマ定義

- 純粋なValibotスキーマの定義のみを行う
- ビジネスロジックやデータアクセスを含めない
- 型推論（`v.InferOutput<typeof Schema>`）用の型をエクスポート

**返り値の型:** `v.BaseSchema` + 推論型

**例:**

```typescript
import * as v from "valibot";

export const HabitInputSchema = v.pipe(
  v.object({
    name: v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, "Name is required"),
      v.maxLength(100, "Name is too long (max 100 characters)"),
    ),
    emoji: v.pipe(
      v.nullable(v.string()),
      v.transform((val) => (val?.trim() ? val.trim() : null)),
    ),
  }),
);

export type HabitInputSchemaType = v.InferOutput<typeof HabitInputSchema>;
```

### `src/lib/habit-data.ts`

**責務:** 習慣関連の静的データとヘルパー関数

- アイコン・カラー・期間などの定数データ定義
- データルックアップ関数（`getIconById`, `getColorById` など）
- 習慣データの変換・フィルタリング関数

**返り値の型:** 直接値、またはフォールバック値を返す

**例:**

```typescript
// 静的データ定義
export const habitIcons: HabitIcon[] = [
  { id: "droplets", icon: Droplets, label: "水を飲む" },
  // ...
];

// ルックアップ関数（フォールバック値を返す）
export function getIconById(id: string): HabitIcon {
  return habitIcons.find((i) => i.id === id) || habitIcons[0];
}

// フィルタリング関数
export function filterHabitsByPeriod<T extends { period: TaskPeriod }>(
  habits: T[],
  periodFilter: "all" | TaskPeriod,
): T[] {
  return periodFilter === "all"
    ? habits
    : habits.filter((h) => h.period === periodFilter);
}
```

### `src/lib/queries/`

**責務:** Drizzle ORMデータアクセス

- **生のDrizzle操作のみ**を行う
- Result.try などのエラーハンドリングは含めない
- 外部ライブラリ（Clerk等）への依存を排除
- 引数は抽出済みデータのみを受け取る（テスト容易性の確保）

**返り値の型:** 生のDrizzle返り値のみ（`Promise<T>`）

**重要な制約:**

- ❌ **Result型を返してはいけない**: `Promise<Result.Result<T, E>>` 形式は禁止
- ✅ **生のPromiseのみ**: `Promise<T>` 形式で返す
- ✅ **エラーはthrowする**: データベースエラーは `throw` で伝播させる
- ✅ **null/undefinedでの失敗表現**: 取得失敗は `null` または `undefined` を返す

**理由:**

- `Result` 型は上位層（`validators`, `actions`）で扱うべきエラーハンドリングパターン
- `queries` 層は純粋なデータアクセスに専念し、エラー解釈は行わない
- データベース例外は自然にthrowし、上位層で適切なエラー型に変換する

**例:**

```typescript
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";

interface UpsertUserInput {
  clerkId: string;
  email: string;
}

export async function upsertUser(input: UpsertUserInput) {
  const db = await getDb();
  const [user] = await db
    .insert(users)
    .values({
      clerkId: input.clerkId,
      email: input.email,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: input.email,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

export async function createHabit(input: HabitInput) {
  const db = await getDb();
  const [habit] = await db.insert(habits).values(input).returning();
  return habit;
}
```

### `src/validators/`

**責務:** バリデーションロジック

- FormDataやリクエストボディのバリデーション
- `src/schemas/` のValibotスキーマを使用
- バリデーション結果を `Result<T, E>` 型で返す

**返り値の型:** `Result.Result<T, E>` (byethrow)

**重要な制約:**

- ✅ **同期的なResult型**: `Result.Result<T, E>` 形式で返す（Promiseでラップしない）
- ✅ **バリデーションエラーを明示**: エラーの場合は `Result.fail(new ValidationError(...))` で返す
- ✅ **成功時は型付きデータ**: `Result.succeed(validatedData)` で型安全な値を返す

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

**重要な制約:**

- ✅ **非同期Result型**: `Promise<Result.ResultAsync<T, E>>` 形式で返す
- ✅ **queries層のエラーをキャッチ**: `Result.try` を使って `queries` からのエラーを適切な型に変換
- ✅ **エラーチェーン**: `Result.pipe` や `Result.andThen` でエラーを伝播させる
- ✅ **成功時の副作用実行**: `Result.isSuccess` でチェックしてから `revalidatePath` などを実行

**データフロー:**

```text
queries (Promise<T>) → Result.try → Promise<Result<T, E>>
                          ↓
validators (Result<T, E>) → Result.andThen → Promise<Result<T, E>>
                          ↓
actions (Promise<Result<T, E>>) → クライアントへ返却
```

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

- **queries** はエラーをthrowするかDrizzleの生の返り値を返す
  - ❌ `Promise<Result<T, E>>` を返してはいけない
  - ✅ `Promise<T>` を返し、エラーは `throw` で伝播
- **validators** は同期的な `Result<T, E>` を返す
  - ✅ バリデーションエラーは `Result.fail` で明示
- **actions** で `Result.try` を使ってエラーをキャッチし、適切なエラー型に変換
  - ✅ `Promise<Result.ResultAsync<T, E>>` 形式で返す
  - ✅ queries からのエラーは `Result.try` でキャッチ

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

`drizzle/` 配下のファイルは自動生成されるため、**直接編集しない**：

```text
drizzle/             # Drizzle マイグレーション（自動生成）
```

生成コマンド: `pnpm db:generate`
