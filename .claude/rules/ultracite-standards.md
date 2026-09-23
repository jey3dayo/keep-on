---
paths:
  - "src/**/*.{ts,tsx,js,jsx}"
---

# Ultracite Code Standards

このプロジェクトでは [Ultracite](https://ultracite.js.org/) を使用してコードフォーマットとLintを管理しています。

## 基本設定

設定ファイル: `biome.jsonc`

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

### ファイル限定の override

ルール全体やファイル全体を off にする前に、例外が必要なマークアップだけを別ファイルへ切り出し、
`biome.jsonc` の `overrides` で対象ファイルを絞り込めないか検討する。

例: `a11y/useFocusableInteractive` は `src/components/habits/HabitCalendarGridStructure.tsx` だけで
off にしている（理由は `biome.jsonc` の該当 override コメントを参照）。

### 除外ディレクトリ

- `src/components/ui/` - shadcn/ui の自動生成コンポーネント

## Lint エラー修正

エラーが発生した場合：

```bash
# 自動修正を試行
pnpm format

# 修正できない場合は手動対応
# biome.jsonc の rules で個別に off にすることも可能
```
