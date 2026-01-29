export const DEFAULT_THEME_MODE = 'system'
export const THEME_MODE_COOKIE_KEY = 'theme'
export const COLOR_THEME_COOKIE_KEY = 'color-theme'
export const COLOR_THEMES = ['teal', 'lime', 'orange', 'red', 'pink', 'purple', 'blue', 'cyan', 'yellow'] as const
export type ColorThemeName = (typeof COLOR_THEMES)[number]
export const DEFAULT_COLOR_THEME: ColorThemeName = 'teal'
export const THEME_COLOR_LIGHT = '#ffffff'
export const THEME_COLOR_DARK = '#000000'

export const isColorTheme = (value: string): value is ColorThemeName => COLOR_THEMES.includes(value as ColorThemeName)
