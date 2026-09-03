import * as v from 'valibot'
import { DAY_START_HOURS } from '@/constants/habit'

const UserDateSchema = v.pipe(v.union([v.date(), v.string()]), v.toDate())

export const UserSchema = v.object({
  createdAt: UserDateSchema,
  dayStartHour: v.picklist(DAY_START_HOURS),
  email: v.string(),
  externalId: v.string(),
  id: v.string(),
  updatedAt: UserDateSchema,
  weekStart: v.picklist(['monday', 'sunday']),
})

export type UserSchemaType = v.InferOutput<typeof UserSchema>

export function safeParseUser(input: unknown) {
  return v.safeParse(UserSchema, input)
}
