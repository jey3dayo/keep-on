// ClerkProvider 未設定で投げられるメッセージを検知する。
// "MissingClerkProvider" と "<ClerkProvider />" の両方を拾う。
const MISSING_PROVIDER_PATTERN = /MissingClerkProvider|<ClerkProvider\s*\/>/i

export function isMissingClerkProviderError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  return MISSING_PROVIDER_PATTERN.test(error.message)
}
