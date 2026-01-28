const OKLCH_COLOR_REGEX = /oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/
const DEFAULT_RING_MIX_RATIO = 0.62
const DEFAULT_FALLBACK = 'rgba(0, 0, 0, 0.15)'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const linearToSrgb = (value: number) => (value <= 0.003_130_8 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055)

const oklchToSrgb = (l: number, c: number, h: number) => {
  const hue = (h * Math.PI) / 180
  const a = c * Math.cos(hue)
  const b = c * Math.sin(hue)

  const l_ = l + 0.396_337_777_4 * a + 0.215_803_757_3 * b
  const m_ = l - 0.105_561_345_8 * a - 0.063_854_172_8 * b
  const s_ = l - 0.089_484_177_5 * a - 1.291_485_548 * b

  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3

  const rLinear = 4.076_741_662_1 * l3 - 3.307_711_591_3 * m3 + 0.230_969_929_2 * s3
  const gLinear = -1.268_438_004_6 * l3 + 2.609_757_401_1 * m3 - 0.341_319_396_5 * s3
  const bLinear = -0.004_196_086_3 * l3 - 0.703_418_614_7 * m3 + 1.707_614_701 * s3

  const r = clamp01(linearToSrgb(rLinear))
  const g = clamp01(linearToSrgb(gLinear))
  const b2 = clamp01(linearToSrgb(bLinear))

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b2 * 255)] as const
}

export function getRingColorFromBackground(
  color: string,
  mixRatio = DEFAULT_RING_MIX_RATIO,
  fallback = DEFAULT_FALLBACK
) {
  const match = color.match(OKLCH_COLOR_REGEX)
  if (!match) {
    const trimmed = color.trim()
    if (trimmed.startsWith('var(')) {
      const mixPercent = Math.round(mixRatio * 100)
      return `color-mix(in oklch, ${trimmed} ${mixPercent}%, black)`
    }
    return fallback
  }

  const [, l, c, h] = match
  const [r, g, b] = oklchToSrgb(Number.parseFloat(l), Number.parseFloat(c), Number.parseFloat(h))
  const mixed = (value: number) => Math.round(value * mixRatio)

  return `rgb(${mixed(r)} ${mixed(g)} ${mixed(b)})`
}
