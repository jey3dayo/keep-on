const OKLCH_COLOR_REGEX = /oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/
const DEFAULT_RING_MIX_RATIO = 0.62
const DEFAULT_FALLBACK = 'rgba(0, 0, 0, 0.15)'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const linearToSrgb = (value: number) =>
  value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055

const oklchToSrgb = (l: number, c: number, h: number) => {
  const hue = (h * Math.PI) / 180
  const a = c * Math.cos(hue)
  const b = c * Math.sin(hue)

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b

  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3

  const rLinear = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  const gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  const bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3

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
    return fallback
  }

  const [, l, c, h] = match
  const [r, g, b] = oklchToSrgb(Number.parseFloat(l), Number.parseFloat(c), Number.parseFloat(h))
  const mixed = (value: number) => Math.round(value * mixRatio)

  return `rgb(${mixed(r)} ${mixed(g)} ${mixed(b)})`
}
