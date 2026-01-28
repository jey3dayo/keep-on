const DEFAULT_REQUEST_TIMEOUT_MS = 8000
const CLOUDFLARE_REQUEST_TIMEOUT_MS = 15_000

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env

function isCloudflareRuntime(): boolean {
  return typeof globalThis !== 'undefined' && 'caches' in globalThis
}

export function getRequestTimeoutMs(): number {
  const raw = env?.REQUEST_TIMEOUT_MS
  const parsed = raw ? Number(raw) : Number.NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return isCloudflareRuntime() ? CLOUDFLARE_REQUEST_TIMEOUT_MS : DEFAULT_REQUEST_TIMEOUT_MS
}
