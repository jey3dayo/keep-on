# Plan 001: ユーザー設定の Server Action に実行時バリデーションを入れ、mass assignment を塞ぐ

> **Executor instructions**: この計画を上から順に実行してください。各ステップの検証コマンドを実行し、
> 期待結果を確認してから次へ進みます。「STOP conditions」に該当したら、改変を続けず報告してください。
> **コミットはしないでください**（作業ツリーに変更を残すだけ）。レビュアーが差分を確認します。
>
> **Drift check（最初に実行）**:
> `git diff --stat 88f423b..HEAD -- src/app/actions/settings/updateUserSettings.ts src/lib/queries/user-settings.ts src/schemas/user-settings.ts`
> 出力が空でない場合、下の「Current state」の抜粋と実際のコードを突き合わせ、一致しなければ STOP。

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `88f423b`, 2026-08-10

## Why this matters

`updateUserSettingsAction` は Server Action です。Server Action の引数はクライアントから送られてくる
任意の JSON であり、TypeScript の型はビルド時に消えるため**実行時の防御になりません**。
現在このアクションは受け取ったオブジェクトを一切検証せずに DB 層へ渡し、DB 層はそれを
`onConflictDoUpdate({ set: { ...settings } })` で UPDATE の SET 句へ展開しています。
`userSettings` テーブルには `id` / `userId` / `createdAt` という実カラムがあるため、
呼び出し側が `{ userId: "<他人のユーザーID>" }` を送ると、自分の設定行を他ユーザーへ付け替えられます。
検証用スキーマ `UpdateUserSettingsSchema` はすでに存在しますが、**どこからも parse に使われていません**。
この計画で、その既存スキーマを境界で適用し、DB 層の SET 句を明示的なカラム列挙に置き換えます。

## Current state

対象ファイルと役割:

- `src/app/actions/settings/updateUserSettings.ts` — 設定更新の Server Action（境界）。検証が無い。
- `src/lib/queries/user-settings.ts` — DB 層。`upsertUserSettings` の SET 句が spread になっている。
- `src/schemas/user-settings.ts` — 検証スキーマ。定義済みだが未使用。

### `src/schemas/user-settings.ts:22-30`（そのまま使う。変更しない）

```ts
export const UpdateUserSettingsSchema = v.partial(
  v.object({
    colorTheme: v.picklist(COLOR_THEMES),
    themeMode: v.picklist(["light", "dark", "system"]),
    weekStart: v.picklist(["monday", "sunday"]),
  }),
);

export type UpdateUserSettingsSchemaType = v.InferOutput<
  typeof UpdateUserSettingsSchema
>;
```

### `src/app/actions/settings/updateUserSettings.ts:11-31`（現状）

```ts
export async function updateUserSettingsAction(
  settings: UpdateUserSettingsSchemaType,
): ServerActionResultAsync<UserSettings, SerializableSettingsError> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return actionError({ message: "Unauthorized", name: "UnauthorizedError" });
  }

  try {
    // 設定を更新または作成（upsert）
    const updated = await updateUserSettings(userId, settings);

    revalidatePath("/dashboard");
    revalidatePath("/settings");

    return actionOk(updated);
  } catch (error) {
    console.error("Failed to update user settings", error);
    return actionError({
      message: "ユーザー設定の更新に失敗しました",
      name: "DatabaseError",
    });
  }
}
```

### `src/lib/queries/user-settings.ts:134-151`（現状。`...settings` が問題箇所）

```ts
const [nextSettings] = await db
  .insert(userSettings)
  .values({
    colorTheme: settings.colorTheme ?? DEFAULT_COLOR_THEME,
    createdAt: now,
    themeMode: settings.themeMode ?? DEFAULT_THEME_MODE,
    updatedAt: now,
    userId,
    weekStart: settings.weekStart ?? DEFAULT_WEEK_START,
  })
  .onConflictDoUpdate({
    set: {
      ...settings,
      updatedAt: now,
    },
    target: userSettings.userId,
  })
  .returning();
```

### 従うべきリポジトリの規約

- **Result 型パターン**: Server Action は例外を投げず `actionOk` / `actionError` を返す。
  実装例は `src/lib/actions/result.ts` と `src/app/actions/habits/utils.ts:54-75`。
- **valibot での境界検証**: 習慣系アクションは `src/validators/habit-action.ts` の
  `validateHabitActionInput` で入力を検証している。この計画も同じ思想（境界で `v.safeParse`）に揃える。
- **エラー型**: 検証失敗時のエラー名は `src/lib/errors/settings.ts` の `SerializableSettingsError` に
  収まる必要がある。既存の値（例: `UnauthorizedError` / `DatabaseError`）を確認し、
  検証エラー用の名前が既にあればそれを使う。**無い場合は `'ValidationError'` を追加してよい**
  （型定義の変更は最小限に留めること）。
- **オブジェクトのキー順**: Biome の設定でオブジェクトキーはアルファベット順に並べる規約があります
  （既存コードがすべてそうなっています）。新規オブジェクトも同様に並べてください。
- **テストの書き方**: `src/app/actions/habits/__tests__/update.test.ts` を構造の手本にすること。

## Commands you will need

| 目的               | コマンド                              | 成功時の期待     |
| ------------------ | ------------------------------------- | ---------------- |
| 型チェック         | `pnpm tsc --noEmit`                   | exit 0、出力なし |
| Lint / format      | `pnpm exec biome check --write src`   | exit 0           |
| テスト（全体）     | `pnpm test:run`                       | 全 pass          |
| テスト（絞り込み） | `pnpm test:run -- updateUserSettings` | 全 pass          |

## Scope

**In scope（これ以外のファイルを変更しない）**:

- `src/app/actions/settings/updateUserSettings.ts`
- `src/lib/queries/user-settings.ts`
- `src/app/actions/settings/__tests__/updateUserSettings.test.ts`（新規作成）
- `src/lib/errors/settings.ts`（検証エラー名の追加が必要な場合**のみ**）

**Out of scope（関連して見えるが触らない）**:

- `src/schemas/user-settings.ts` — スキーマは既に正しい。使うだけ。
- `src/app/actions/settings/updateWeekStart.ts` — 単なるラッパー。呼び出しシグネチャを変えないこと。
- `src/components/settings/**` — UI 側の呼び出しは既に正しい値しか送っていない。変更不要。
- `src/db/schema.ts` — スキーマ変更やマイグレーションは**この計画の範囲外**。

## Steps

### Step 1: Server Action の境界で `UpdateUserSettingsSchema` を適用する

`src/app/actions/settings/updateUserSettings.ts` を次の形に変更します。

- 引数の型は `UpdateUserSettingsSchemaType` のままでよいが、**関数の先頭で `v.safeParse` する**。
  引数を `unknown` として受けてから parse するのがより厳密なので、
  呼び出し側（`updateWeekStart.ts` と `src/components/settings/**`）の型が壊れない範囲で
  `unknown` 受けにできるならそうする。壊れるなら型は据え置きで parse だけ追加する。
- parse 失敗時は `actionError` を返す（例外を投げない）。
- parse 成功時は **`parseResult.output`（検証済みの値）だけ**を `updateUserSettings` へ渡す。
  元の `settings` 変数を以降で使わないこと。これが余分なキーを落とす仕組みです。
- 認証チェック（`getCurrentUserId`）は現状のまま残す。順序は検証 → 認証でも認証 → 検証でもよい。

**Verify**: `pnpm tsc --noEmit` → exit 0

### Step 2: DB 層の SET 句から spread を排除する

`src/lib/queries/user-settings.ts` の `upsertUserSettings` 内、`onConflictDoUpdate` の `set` を
`...settings` から**明示的なカラム列挙**に置き換えます。更新してよいカラムは次の 3 つと `updatedAt` だけです。

- `colorTheme`
- `themeMode`
- `weekStart`
- `updatedAt`（常に `now`）

`settings` は部分更新なので、値が `undefined` のキーは SET に含めないでください
（含めると既存値が NULL 相当で潰れる恐れがあります）。
条件付きスプレッド（`...(settings.colorTheme !== undefined ? { colorTheme: settings.colorTheme } : {})`）
のような形で、**キー名は必ずリテラルで書く**こと。

`id` / `userId` / `createdAt` は絶対に SET に含めないこと。

**Verify**:

```bash
grep -n "\.\.\.settings" src/lib/queries/user-settings.ts
```

→ **マッチ 0 件**（出力なし、exit 1）であること。

### Step 3: 回帰テストを書く

`src/app/actions/settings/__tests__/updateUserSettings.test.ts` を新規作成します。
構造は `src/app/actions/habits/__tests__/update.test.ts` に倣ってください
（`vi.mock` で `@/lib/user` の `getCurrentUserId`、`@/lib/queries/user-settings` の
`updateUserSettings`、`next/cache` の `revalidatePath` をモックする形）。

書くケース:

1. **正常系**: `{ themeMode: 'dark' }` を渡すと `ok: true` が返り、
   モックした `updateUserSettings` が `(userId, { themeMode: 'dark' })` で呼ばれる。
2. **未認証**: `getCurrentUserId` が `null` を返すとき `ok: false` かつ
   エラー名が `'UnauthorizedError'`。`updateUserSettings` は呼ばれない。
3. **不正な値の拒否**: `{ themeMode: 'rainbow' }` を渡すと `ok: false` が返り、
   `updateUserSettings` が**呼ばれない**こと。
4. **余分なキーの除去（この計画の主目的）**:
   `{ themeMode: 'dark', userId: 'attacker-user-id', id: 'forged-id' }` を渡したとき、
   `updateUserSettings` に渡る第2引数に `userId` と `id` が**含まれていない**こと
   （`expect(arg).not.toHaveProperty('userId')` の形で明示的に検査する）。
   TypeScript の型と衝突する場合は、テスト側で `as never` などの型アサーションを使わず、
   引数を一度 `Record<string, unknown>` 型の変数に入れてから渡すこと
   （リポジトリ規約で型アサーションの新規導入は禁止です）。

**Verify**: `pnpm test:run -- updateUserSettings` → 4 件すべて pass

### Step 4: 全体ゲートを通す

**Verify**:

```bash
pnpm exec biome check --write src && pnpm tsc --noEmit && pnpm test:run
```

→ すべて exit 0、既存 148 件 + 新規 4 件が pass

## Test plan

- 新規: `src/app/actions/settings/__tests__/updateUserSettings.test.ts` に上記 4 ケース。
- 構造の手本: `src/app/actions/habits/__tests__/update.test.ts`。
- ケース 4 がこの計画の回帰テスト本体です。これが無いと同じ穴が再発します。

## Done criteria

すべて満たすこと:

- [ ] `pnpm tsc --noEmit` が exit 0
- [ ] `pnpm test:run` が exit 0。新規 4 ケースが存在し pass する
- [ ] `grep -n "\.\.\.settings" src/lib/queries/user-settings.ts` が 0 件
- [ ] `updateUserSettingsAction` 内に `v.safeParse(UpdateUserSettingsSchema, ...)` が存在する
- [ ] `git status --short` で変更されたファイルが In scope のリストのみ
- [ ] `plans/README.md` の 001 の行の Status を更新（レビュアーが管理すると言われた場合は不要）

## STOP conditions

以下に該当したら改変を止めて報告してください:

- 「Current state」の抜粋と実際のコードが一致しない
- `updateUserSettingsAction` の引数を `unknown` に変えると、`src/components/settings/**` や
  `updateWeekStart.ts` で型エラーが出て、In scope 外のファイル修正が必要になる
  （→ 引数の型は据え置きにして parse だけ追加する方針へ切り替え、その旨を報告に書く）
- 検証エラーを表現できるエラー名が `SerializableSettingsError` に無く、
  型定義の変更が `src/lib/errors/settings.ts` の範囲を超える
- 同じ検証コマンドが、妥当な修正を 2 回試しても失敗する
- `db.insert(...).onConflictDoUpdate({ set: ... })` を明示列挙に書き換えると
  Drizzle の型エラーが解消できない（→ 実際の型エラー全文を添えて報告）

## Maintenance notes

- 今後 `userSettings` にカラムを追加するときは、**`UpdateUserSettingsSchema` と
  Step 2 の明示列挙の両方**を更新する必要があります。片方だけだと「更新できない設定」または
  「検証されない設定」が生まれます。
- レビュー時に見るべき点: `set` 句にリテラル以外のキーが混ざっていないか、
  Server Action が `parseResult.output` 以外の値を DB 層へ渡していないか。
- **意図的に範囲外にしたもの**: `user-settings.ts` に散在する `console.error` を
  `src/lib/logging.ts` の構造化ログへ寄せる作業。別件（ログ統一）として扱います。
