import * as v from 'valibot'

/**
 * キャッシュデータのスキーマ定義
 */

/** 総チェックイン数キャッシュデータ */
export const TotalCheckinsSchema = v.object({
  timestamp: v.pipe(v.number(), v.integer(), v.minValue(0)),
  total: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export type TotalCheckinsSchemaType = v.InferOutput<typeof TotalCheckinsSchema>

/** 習慣キャッシュデータ */
export const HabitsCacheDataSchema = v.object({
  dateKey: v.string(),
  habits: v.array(v.any()), // HabitWithProgress は複雑な型なので any で許容
  staleAt: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  timestamp: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export type HabitsCacheDataSchemaType = v.InferOutput<typeof HabitsCacheDataSchema>
