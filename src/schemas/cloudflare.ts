import * as v from 'valibot'

export const HyperdriveBindingSchema = v.object({
  connectionString: v.pipe(v.string(), v.minLength(1)),
})

export const CloudflareEnvBindingsSchema = v.object({
  HYPERDRIVE: v.optional(HyperdriveBindingSchema),
  DATABASE_URL: v.optional(v.pipe(v.string(), v.minLength(1))),
})

export type CloudflareEnvBindings = v.InferOutput<typeof CloudflareEnvBindingsSchema>

export function safeParseCloudflareEnvBindings(input: unknown) {
  return v.safeParse(CloudflareEnvBindingsSchema, input)
}
