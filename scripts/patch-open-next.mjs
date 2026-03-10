#!/usr/bin/env node
/**
 * Post-build patch for OpenNext Cloudflare init.js
 *
 * Clerk v7 reads CLERK_SECRET_KEY via module-level constant at init time.
 * OpenNext populates process.env only on first request (inside runWithCloudflareRequestContext).
 * This patch pre-populates process.env from next-env.mjs at module load time so Clerk
 * can read CLERK_SECRET_KEY before the first request arrives.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const initPath = join(__dirname, '../.open-next/cloudflare/init.js')
const preloadEnvKeys = [
  'CLERK_ENCRYPTION_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_FRONTEND_API',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
]

const content = readFileSync(initPath, 'utf-8')

if (content.includes('// [patched: pre-init process.env]')) {
  console.log('[patch-open-next] Already patched, skipping.')
  process.exit(0)
}

const patchCode = `
// [patched: pre-init process.env]
// Pre-populate process.env from embedded next-env.mjs at module load time.
// Required for Clerk v7: its module-level SECRET_KEY constant reads process.env
// before OpenNext's populateProcessEnv runs on the first request.
{
  const _initEnv = nextEnvVars["production"] ?? {};
  const _allowedEnvKeys = new Set(${JSON.stringify(preloadEnvKeys)});
  for (const k of _allowedEnvKeys) {
    const v = _initEnv[k];
    if (typeof v === "string" && process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
}
`

const patched = content.replace('let initialized = false;', `${patchCode}\nlet initialized = false;`)

if (patched === content) {
  console.error('[patch-open-next] ERROR: Could not find injection point in init.js')
  process.exit(1)
}

writeFileSync(initPath, patched)
console.log('[patch-open-next] Successfully patched .open-next/cloudflare/init.js')
