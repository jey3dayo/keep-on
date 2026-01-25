---
paths: "src/**/*.{ts,tsx,js,jsx}"
---

# Ultracite Code Standards

このプロジェクトでは [Ultracite](https://ultracite.js.org/) を使用してコードフォーマットとLintを管理しています。

## 基本設定

**設定ファイル**: `biome.jsonc`

```jsonc
{
  "extends": [
    "ultracite/biome/core",
    "ultracite/biome/react",
    "ultracite/biome/next",
  ],
}
```

## フォーマットルール

| 項目       | 設定値                  |
| ---------- | ----------------------- |
| 行幅       | 120文字                 |
| クォート   | シングルクォート (`'`)  |
| セミコロン | 必要時のみ (`asNeeded`) |
| 末尾カンマ | ES5準拠 (`es5`)         |

## コマンド

```bash
# フォーマット + Lint修正
pnpm format          # または mise run format

# Lintチェックのみ
pnpm lint            # または mise run lint

# 包括的チェック（format + lint + types + markdown + yaml）
mise run check
```

## プロジェクト固有の設定

### 無効化したルール

| ルール                    | 理由                                            |
| ------------------------- | ----------------------------------------------- |
| `useFilenamingConvention` | Next.js App Router の規約に従うため             |
| `noUnknownAtRules`        | Tailwind CSS v4 の `@theme` ディレクティブ対応  |
| `noNamespaceImport`       | Drizzle schema の `import * as schema` パターン |
| `noBarrelFile`            | コンポーネントの re-export パターン             |

### 除外ディレクトリ

- `src/components/ui/` - shadcn/ui の自動生成コンポーネント

## コード生成時の注意

AIがコードを生成する際は以下を遵守：

1. **シングルクォート**: 文字列リテラルは `'string'` 形式
2. **セミコロンなし**: 文末にセミコロンを付けない
3. **120文字制限**: 長い行は適切に改行
4. **ES5末尾カンマ**: 配列・オブジェクトの最後の要素にカンマ

**良い例:**

```tsx
const config = {
  name: "keep-on",
  version: "0.1.0",
};

export function Button({ children }: { children: React.ReactNode }) {
  return <button className="px-4 py-2">{children}</button>;
}
```

**悪い例:**

```tsx
const config = {
  name: "keep-on";  // ❌ ダブルクォート、セミコロン
  version: "0.1.0"  // ❌ 末尾カンマなし
};

export function Button({ children }: { children: React.ReactNode }) {
  return <button className="px-4 py-2">{children}</button>;  // ❌ セミコロン
}
```

## Lint エラー修正

エラーが発生した場合：

```bash
# 自動修正を試行
pnpm format

# 修正できない場合は手動対応
# biome.jsonc の rules で個別に off にすることも可能
```
