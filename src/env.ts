import { type EnvSchema, parseEnv } from '@/schemas/env'

// Cloudflare Workers環境ではprocess.envが空のため、skipValidationオプションを使用
const shouldSkipValidation = !!process.env.SKIP_ENV_VALIDATION

export const env = shouldSkipValidation
  ? (process.env as unknown as EnvSchema)
  : parseEnv({
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    })
