/**
 * Transform層: FormDataから習慣データへの変換
 * UI都合・入力形式都合のみを扱う
 */

/**
 * FormDataから習慣入力データへの変換
 * UIからの生のFormDataをバリデーション可能な形式に変換する
 */
export function transformHabitInput(formData: FormData) {
  const getString = (key: string): string | undefined => {
    const v = formData.get(key)
    return typeof v === 'string' ? v : undefined
  }

  const getRequiredString = (key: string): string => {
    const v = getString(key)?.trim()
    return v || ''
  }

  const periodRaw = getString('period')
  const frequencyRaw = getString('frequency')
  const parsedFrequency = frequencyRaw ? Number(frequencyRaw) : undefined

  // periodが省略された場合は 'daily' とみなす
  const isDaily = periodRaw === 'daily' || periodRaw === undefined

  // Daily の場合は frequency を 1 に固定
  // それ以外の場合は数値変換した値を使用（undefinedのままの場合あり）
  let frequency: number | undefined
  if (isDaily) {
    frequency = 1
  } else if (typeof parsedFrequency === 'number' && Number.isFinite(parsedFrequency)) {
    frequency = parsedFrequency
  } else {
    frequency = undefined
  }

  return {
    name: getRequiredString('name'),
    icon: getString('icon'),
    color: getString('color'),
    period: periodRaw,
    frequency,
  }
}

/**
 * FormDataから習慣更新データへの変換（部分更新対応）
 * PATCH操作のためのFormDataを部分更新用の形式に変換する
 */
export function transformHabitUpdate(formData: FormData) {
  const getString = (key: string): string | undefined => {
    const v = formData.get(key)
    return typeof v === 'string' ? v : undefined
  }

  const getOptionalString = (key: string): string | undefined => {
    const v = getString(key)?.trim()
    return v ? v : undefined
  }

  const getOptionalNumber = (key: string): number | undefined => {
    const v = getOptionalString(key)
    if (v === undefined) {
      return undefined
    }
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  const period = getOptionalString('period')
  const frequency = getOptionalNumber('frequency')

  // Daily の場合は frequency を 1 に
  const isDaily = period === 'daily'
  const adjustedFrequency = isDaily ? 1 : frequency

  // 部分更新のため、値があるフィールドのみを含める
  const input: Record<string, unknown> = {}

  const name = getOptionalString('name')
  if (name !== undefined) {
    input.name = name
  }

  const icon = getString('icon')
  if (icon !== undefined) {
    input.icon = icon
  }

  const color = getString('color')
  if (color !== undefined) {
    input.color = color
  }

  if (period !== undefined) {
    input.period = period
  }

  if (adjustedFrequency !== undefined) {
    input.frequency = adjustedFrequency
  }

  return input
}
