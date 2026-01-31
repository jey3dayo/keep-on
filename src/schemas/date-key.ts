import * as v from 'valibot'

export const DateKeySchema = v.pipe(v.string(), v.trim(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date key must be YYYY-MM-DD'))

export type DateKey = v.InferOutput<typeof DateKeySchema>

export function safeParseDateKey(input: unknown) {
  return v.safeParse(DateKeySchema, input)
}
