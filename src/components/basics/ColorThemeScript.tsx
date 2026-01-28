import { COLOR_THEME_COOKIE_KEY, COLOR_THEMES, DEFAULT_COLOR_THEME } from '@/constants/theme'

const colorThemeScript = `
(function() {
  try {
    var cookieValue = document.cookie
      .split('; ')
      .find(function (row) { return row.startsWith('${COLOR_THEME_COOKIE_KEY}='); });
    var value = cookieValue ? decodeURIComponent(cookieValue.split('=').slice(1).join('=')) : null;
    var theme = value && ${JSON.stringify(COLOR_THEMES)}.includes(value) ? value : '${DEFAULT_COLOR_THEME}';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`

export function ColorThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: colorThemeScript }} suppressHydrationWarning />
}
