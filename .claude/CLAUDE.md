# KeepOn Project Configuration

## プロジェクト概要

KeepOn は、Next.js 15 + Cloudflare Workers + Drizzle ORM + Supabase + Clerk で構築された PWA アプリケーションです。

**主要技術:**

- Next.js 15 (App Router, Turbopack)
- OpenNext + Cloudflare Workers (Edge デプロイ)
- Drizzle ORM + Supabase (PostgreSQL)
- Clerk (認証)
- Tailwind CSS v4.x
- Ultracite (Biome) - フォーマット/Lint

詳細な技術スタック情報は `.claude/rules/tech-stack.md` を参照してください。

## 利用 MCP サーバー

| MCP       | 用途                                        |
| --------- | ------------------------------------------- |
| context7  | 最新ライブラリドキュメント取得              |
| serena    | セマンティックコード解析・編集              |
| greptile  | PR/コードレビュー支援                       |
| ultracite | Ultracite AI 統合（コード品質・最適化支援） |

> **Note**: ライブラリの仕様や API で困った場合は、context7 を使用して最新ドキュメントを取得してください。

## 利用 Skills

| Skill                 | 用途                                                   |
| --------------------- | ------------------------------------------------------ |
| kiro:spec-\*          | Spec-Driven Development                                |
| gh-address-comments   | GitHub PR コメント対応                                 |
| ui-ux-pro-max         | UI/UXデザイン支援                                      |
| web-design-guidelines | Web UIガイドライン準拠チェック（アクセシビリティ、UX） |
| react-best-practices  | React/Next.jsパフォーマンス最適化ガイドライン          |

## コマンド

```bash
# 開発
pnpm dev              # 開発サーバー起動

# データベース
pnpm db:generate      # Drizzle migration 生成
pnpm db:push          # スキーマ同期（dev用）
pnpm db:migrate       # マイグレーション実行
pnpm db:studio        # Drizzle Studio 起動

# Cloudflare
pnpm build:cf         # OpenNext ビルド
pnpm deploy           # Cloudflare デプロイ
pnpm preview          # ローカルプレビュー

# 環境変数
pnpm env:encrypt      # .env 暗号化
pnpm env:run -- <cmd> # 復号して実行

# mise タスク
mise run format       # Ultracite + Taplo + Markdownlint
mise run lint         # 型チェック + Biome + Markdown + YAML
mise run check        # format + lint
mise run ci           # CI相当のチェック
```

## 開発規約

コードスタイル、ディレクトリ構造、セキュリティガイドラインは以下を参照してください：

- `.claude/rules/code-style.md` - コードスタイルと開発規約
- `.claude/rules/tech-stack.md` - 技術スタック詳細
- `.claude/rules/security.md` - セキュリティガイドライン
- `.claude/rules/dotenvx.md` - dotenvx 暗号化管理ガイド

## フォーマット/Lint

- **ツール**: Ultracite (Biome)
- **スタイル**: シングルクォート、セミコロンなし、行幅120
- **実行**: `mise run format` / `mise run lint`

## 環境変数設定

dotenvx による暗号化管理:

- `.env` - 暗号化済み（コミット対象）
- `.env.keys` - 秘密鍵（**絶対にコミットしない**）

認証情報の取得先:

- **Clerk**: https://dashboard.clerk.com/
- **Supabase**: https://supabase.com/dashboard
  - Transaction Mode (Port 6543) の接続文字列を使用
  - `?pgbouncer=true` パラメータを追加

詳細は `.claude/rules/dotenvx.md` および `.claude/rules/security.md` を参照してください。

## 次のステップ

1. Clerk と Supabase プロジェクトを作成
2. 環境変数を復号化して編集

   ```bash
   # .envを復号化して一時的に平文で編集
   pnpm dotenvx decrypt
   # 編集後に再暗号化
   pnpm env:encrypt
   ```

3. `pnpm db:push` でスキーマを同期
4. 開発サーバー起動: `pnpm env:run -- pnpm dev`
5. `/sign-in` でサインイン確認

## Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.
