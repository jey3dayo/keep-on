import { z } from 'zod'

export const PgbouncerParamSchema = z.preprocess(
  (value) => value === '' || value === 'true' || value === '1',
  z.boolean()
)
