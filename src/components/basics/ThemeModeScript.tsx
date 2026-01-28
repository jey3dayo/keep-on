import { DEFAULT_THEME_MODE, THEME_COLOR_DARK, THEME_COLOR_LIGHT, THEME_MODE_COOKIE_KEY } from '@/constants/theme'

const themeModeScript = `
(function() {
  try {
    var cookieValue = document.cookie
      .split('; ')
      .find(function (row) { return row.startsWith('${THEME_MODE_COOKIE_KEY}='); });
    var value = cookieValue ? decodeURIComponent(cookieValue.split('=').slice(1).join('=')) : null;
    var mode = value === 'light' || value === 'dark' || value === 'system' ? value : '${DEFAULT_THEME_MODE}';
    var resolved = mode;
    if (mode === 'system') {
      var mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      resolved = mql && mql.matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', resolved === 'dark' ? '${THEME_COLOR_DARK}' : '${THEME_COLOR_LIGHT}');
  } catch (e) {}
})();
`

export function ThemeModeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeModeScript }} suppressHydrationWarning />
}
