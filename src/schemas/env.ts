import * as v from 'valibot'

/**
 * ランタイムで検証できる環境変数のスキーマ。
 *
 * `NEXT_PUBLIC_*` は Next.js がビルド時にリテラルへ置換するため、ランタイムに
 * `process.env` 参照が残らない。起動時に検証しても実行環境の設定ミスは捕まらず、
 * 逆にビルド時の注入漏れを実行環境の不備として誤検知する。ビルド側で検査する。
 *
 * `CLOUDFLARE_*` はデプロイ時にのみ使う値で、Worker ランタイムには存在しないのが正常。
 */
const runtimeEnvSchema = v.object({
  CLERK_SECRET_KEY: v.pipe(v.string(), v.minLength(1)),
})

interface RuntimeEnvInput {
  CLERK_SECRET_KEY?: string
}

/**
 * 検証に失敗したキー名だけを返す。
 *
 * ValiError の issues は入力値を保持するため、例外や戻り値に載せると
 * 秘密鍵がログへ流出する。キー名のみを返して呼び出し側が値に触れないようにする。
 */
export function findInvalidEnvKeys(input: RuntimeEnvInput): string[] {
  const result = v.safeParse(runtimeEnvSchema, input)

  if (result.success) {
    return []
  }

  return result.issues.map((issue) => v.getDotPath(issue) ?? 'unknown')
}
