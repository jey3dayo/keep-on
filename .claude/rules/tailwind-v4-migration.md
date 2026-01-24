# Tailwind v4 + OKLCH 移行完了

## 移行日

2026-01-25

## 実施内容

### 1. globals.css の全面書き換え

**変更点:**

- `@import "tailwindcss"` + `@theme inline` ディレクティブに移行
- すべてのカラー値を HEX/HSL から OKLCH に変換
- Radix Colors Lime パレット（Light/Dark）を OKLCH で再定義
- テーマバリエーション（orange, red, pink, purple, blue, cyan, yellow）を OKLCH 化

**新しい構造:**

```css
@import "tailwindcss";
@config "../../tailwind.config.ts";

@theme inline {
  /* Tailwind ユーティリティクラスへのマッピング */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... その他のカラートークン */

  /* radius トークン */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  /* OKLCH カラー定義 */
  --lime-1: oklch(0.993 0.012 143);
  /* ... */
}

.dark {
  /* Dark モード OKLCH カラー */
  --lime-1: oklch(0.14 0.025 130);
  /* ... */
}

[data-theme="orange"] {
  /* テーマバリエーション */
  --primary: oklch(0.68 0.21 48);
  /* ... */
}
```

### 2. tailwind.config.ts の簡素化

**削除内容:**

- `colors` 拡張定義（`@theme inline` に移行したため不要）
- `borderRadius` 拡張定義（`@theme inline` の radius トークンに移行）

**残した内容:**

- `darkMode: 'class'`
- `content` パス定義
- カスタム `animation` / `keyframes`（pulse-ring, check-mark, progress-fill）

## OKLCH への変換例

| 元の形式          | OKLCH                    |
| ----------------- | ------------------------ |
| `#fbfefa`         | `oklch(0.993 0.012 143)` |
| `hsl(0 0% 45.1%)` | `oklch(0.533 0 0)`       |
| `#e5484d`         | `oklch(0.61 0.225 25)`   |
| `#ffffff`         | `oklch(1 0 0)`           |

## OKLCH のメリット

1. **知覚的均一性**: 人間の視覚に近い色空間
2. **色相の統一**: 同じ Lightness で色相を統一的に扱える
3. **広色域対応**: P3 など広色域ディスプレイに最適
4. **補間の美しさ**: アニメーション時の色変化が自然

## 互換性

- **Tailwind CSS v4**: 完全対応（`@theme inline` は v4 推奨形式）
- **shadcn/ui**: 互換性維持（カラートークン名は変更なし）
- **ブラウザ**: Safari 15.4+, Chrome 111+, Firefox 113+ で OKLCH サポート

## 検証済み項目

- [x] ライトモード表示
- [x] ダークモード表示
- [x] テーマバリエーション（data-theme 属性）
- [x] Button コンポーネント（primary, secondary, destructive）
- [x] Card コンポーネント
- [x] Input / Field コンポーネント
- [x] Sheet / DropdownMenu
- [x] Lint エラーなし

## 今後の方針

- 新規カラー追加時は OKLCH 形式を使用
- `@theme inline` ディレクティブ内でトークン管理
- tailwind.config.ts は最小限の設定のみ保持

## 参考資料

- [Tailwind v4 - shadcn/ui](https://ui.shadcn.com/docs/tailwind-v4)
- [OKLCH Color Space](https://developer.chrome.com/blog/oklab-oklch/)
- [Radix Colors](https://www.radix-ui.com/colors)
