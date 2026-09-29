/**
 * App colour theme: follow the OS ("system") or force light/dark.
 * Applied as `data-theme` on <html>, which style.css keys its dark tokens
 * off. index.html runs an inline copy of the initial apply step before the
 * stylesheet loads, so a saved dark choice never flashes light first — keep
 * THEME_STORAGE_KEY in sync with that script.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'qrwebapp.theme';
const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

// Must match the --color-bg tokens in style.css.
const THEME_COLOR: Record<'light' | 'dark', string> = { light: '#f5f6f8', dark: '#0e0f13' };

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(pref: ThemePreference): void {
  const root = document.documentElement;
  if (pref === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = pref;
  }
  // index.html ships one theme-color meta per OS scheme; when the user forces
  // a theme, point both at it so the browser chrome matches the page.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = THEME_COLOR[pref === 'system' ? scheme : pref];
  });
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    if (pref === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    }
  } catch {
    // Best-effort — if storage is blocked, the choice just lasts this session.
  }
  applyTheme(pref);
}

export function nextThemePreference(pref: ThemePreference): ThemePreference {
  return ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
}
