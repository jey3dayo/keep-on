import { formatError } from '@/lib/logging'
import { safeParseErrorWithCode } from '@/schemas/error'

export function extractDbErrorInfo(error: unknown): { message: string; code?: string; causeCode?: string } {
  const formatted = formatError(error)
  let code: string | undefined
  let causeCode: string | undefined
  let causeMessage: string | undefined

  const parsed = safeParseErrorWithCode(error)
  if (parsed.success) {
    if (parsed.output.code) {
      code = parsed.output.code
    }
    const cause = parsed.output.cause
    if (cause) {
      const causeFormatted = formatError(cause)
      if (causeFormatted.message && causeFormatted.message !== formatted.message) {
        causeMessage = causeFormatted.message
      }
      const parsedCause = safeParseErrorWithCode(cause)
      if (parsedCause.success && parsedCause.output.code) {
        causeCode = parsedCause.output.code
        if (!code) {
          code = parsedCause.output.code
        }
      }
    }
  }

  const message = causeMessage ? `${formatted.message} | ${causeMessage}` : formatted.message
  return { message, code, causeCode }
}
