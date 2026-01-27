import * as v from 'valibot'

export const ClerkApiErrorEntrySchema = v.object({
  code: v.optional(v.string()),
  message: v.optional(v.string()),
})

export const ClerkApiResponseErrorSchema = v.object({
  name: v.optional(v.string()),
  status: v.optional(v.number()),
  clerkTraceId: v.optional(v.nullable(v.string())),
  errors: v.optional(v.array(v.optional(ClerkApiErrorEntrySchema))),
})

export interface ClerkApiResponseErrorPayload extends Record<string, unknown> {
  status?: number
  clerkTraceId?: string
  errors?: Array<{ code?: string; message?: string }>
}

export function parseClerkApiResponseErrorPayload(error: unknown): ClerkApiResponseErrorPayload | null {
  const parsed = v.safeParse(ClerkApiResponseErrorSchema, error)
  if (!parsed.success || parsed.output.name !== 'ClerkAPIResponseError') {
    return null
  }

  const { status, clerkTraceId, errors } = parsed.output

  return {
    status,
    clerkTraceId: clerkTraceId ?? undefined,
    errors: errors?.map((entry) => ({ code: entry?.code, message: entry?.message })),
  }
}
