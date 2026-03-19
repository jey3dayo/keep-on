import * as v from 'valibot'

export const DateKeySchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date key must be YYYY-MM-DD'),
  v.check((val) => {
    const d = new Date(`${val}T00:00:00`)
    if (Number.isNaN(d.getTime())) {
      return false
    }
    // ラウンドトリップ検証: 2024-13-01 → Invalid Date、2024-02-30 → 2024-03-01 になるケースを排除
    const [y, m, day] = val.split('-').map(Number)
    return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day
  }, 'Invalid calendar date')
)

export type DateKey = v.InferOutput<typeof DateKeySchema>

export function safeParseDateKey(input: unknown) {
  return v.safeParse(DateKeySchema, input)
}
