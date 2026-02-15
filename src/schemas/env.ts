import * as v from 'valibot'

const envSchema = v.object({
  // Server
  CLERK_SECRET_KEY: v.pipe(v.string(), v.minLength(1)),
  CLOUDFLARE_API_TOKEN: v.optional(v.string()),
  CLOUDFLARE_ACCOUNT_ID: v.optional(v.string()),

  // Client (NEXT_PUBLIC_*)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: v.pipe(v.string(), v.minLength(1)),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: v.pipe(v.optional(v.string(), '/sign-in'), v.startsWith('/')),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: v.pipe(v.optional(v.string(), '/sign-up'), v.startsWith('/')),
})

export type EnvSchema = v.InferOutput<typeof envSchema>

interface EnvInput {
  CLERK_SECRET_KEY?: string
  CLOUDFLARE_API_TOKEN?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string
  NEXT_PUBLIC_CLERK_SIGN_IN_URL?: string
  NEXT_PUBLIC_CLERK_SIGN_UP_URL?: string
}

export function parseEnv(input: EnvInput): EnvSchema {
  return v.parse(envSchema, input)
}
