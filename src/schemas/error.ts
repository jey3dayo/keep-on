import * as v from 'valibot'

export const ErrorWithCodeSchema = v.object({
  code: v.optional(v.string()),
  cause: v.optional(v.any()),
})

export type ErrorWithCode = v.InferOutput<typeof ErrorWithCodeSchema>

export function safeParseErrorWithCode(input: unknown) {
  return v.safeParse(ErrorWithCodeSchema, input)
}
