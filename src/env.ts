import * as v from 'valibot'

const envSchema = v.object({
  // Server
  DATABASE_URL: v.pipe(v.string(), v.url()),
  DIRECT_URL: v.optional(v.pipe(v.string(), v.url())),
  CLERK_SECRET_KEY: v.pipe(v.string(), v.minLength(1)),
  CLOUDFLARE_API_TOKEN: v.optional(v.string()),
  CLOUDFLARE_ACCOUNT_ID: v.optional(v.string()),

  // Client (NEXT_PUBLIC_*)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: v.pipe(v.string(), v.minLength(1)),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: v.pipe(v.optional(v.string(), '/sign-in'), v.startsWith('/')),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: v.pipe(v.optional(v.string(), '/sign-up'), v.startsWith('/')),
})

// Cloudflare Workers環境ではprocess.envが空のため、skipValidationオプションを使用
const shouldSkipValidation = !!process.env.SKIP_ENV_VALIDATION

export const env = shouldSkipValidation
  ? (process.env as unknown as v.InferOutput<typeof envSchema>)
  : v.parse(envSchema, {
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    })
