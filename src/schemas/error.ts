import * as v from 'valibot'

export const ErrorWithCodeSchema = v.object({
  cause: v.optional(v.any()),
  code: v.optional(v.string()),
})

export type ErrorWithCode = v.InferOutput<typeof ErrorWithCodeSchema>

export function safeParseErrorWithCode(input: unknown) {
  return v.safeParse(ErrorWithCodeSchema, input)
}
