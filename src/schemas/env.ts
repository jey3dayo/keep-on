import * as v from 'valibot'

const envSchema = v.object({
  // Server
  CLERK_SECRET_KEY: v.pipe(v.string(), v.minLength(1)),
  CLOUDFLARE_ACCOUNT_ID: v.optional(v.string()),
  CLOUDFLARE_API_TOKEN: v.optional(v.string()),

  // Client (NEXT_PUBLIC_*)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: v.pipe(v.string(), v.minLength(1)),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: v.pipe(v.optional(v.string(), '/sign-in'), v.startsWith('/')),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: v.pipe(v.optional(v.string(), '/sign-up'), v.startsWith('/')),
})

interface EnvInput {
  CLERK_SECRET_KEY?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_API_TOKEN?: string
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string
  NEXT_PUBLIC_CLERK_SIGN_IN_URL?: string
  NEXT_PUBLIC_CLERK_SIGN_UP_URL?: string
}

/**
 * 検証に失敗したキー名だけを返す。
 *
 * ValiError の issues は入力値を保持するため、例外や戻り値に載せると
 * 秘密鍵がログへ流出する。キー名のみを返して呼び出し側が値に触れないようにする。
 */
export function findInvalidEnvKeys(input: EnvInput): string[] {
  const result = v.safeParse(envSchema, input)

  if (result.success) {
    return []
  }

  return result.issues.map((issue) => v.getDotPath(issue) ?? 'unknown')
}
