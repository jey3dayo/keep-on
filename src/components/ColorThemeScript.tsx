const STORAGE_KEY = 'color-theme'
const DEFAULT_THEME = 'lime'
const VALID_THEMES = ['lime', 'orange', 'red', 'pink', 'purple', 'blue', 'cyan', 'yellow']

const colorThemeScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var theme = stored && ${JSON.stringify(VALID_THEMES)}.includes(stored) ? stored : '${DEFAULT_THEME}';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`

export function ColorThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: colorThemeScript }} suppressHydrationWarning />
}
