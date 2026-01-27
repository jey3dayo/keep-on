import * as v from 'valibot'

export const CookieSameSiteSchema = v.picklist(['lax', 'strict', 'none'])

export const CookieOptionsSchema = v.object({
  path: v.optional(v.string()),
  maxAge: v.optional(v.pipe(v.number(), v.minValue(0))),
  sameSite: v.optional(CookieSameSiteSchema),
})

export type CookieOptions = v.InferOutput<typeof CookieOptionsSchema>

export function safeParseCookieOptions(input: unknown) {
  return v.safeParse(CookieOptionsSchema, input)
}
