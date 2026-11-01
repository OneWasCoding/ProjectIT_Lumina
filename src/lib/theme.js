// Theme + accent handling. Preferences live in localStorage (so they apply instantly, even
// before login) and are synced to the user's profile when it loads / is saved.

const THEME_KEY = 'lumina-theme'
const ACCENT_KEY = 'lumina-accent'

export const THEMES = ['light', 'dark', 'system']

export const ACCENTS = [
  { id: 'violet', name: 'Violet', hex: '#7c5cfc' },
  { id: 'blue', name: 'Ocean', hex: '#3b82f6' },
  { id: 'teal', name: 'Teal', hex: '#14b8a6' },
  { id: 'green', name: 'Forest', hex: '#22a55b' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e' },
]

export const DEFAULT_THEME = 'dark'
export const DEFAULT_ACCENT = 'violet'

export function getStoredPrefs() {
  try {
    const theme = localStorage.getItem(THEME_KEY)
    const accent = localStorage.getItem(ACCENT_KEY)
    return {
      theme: THEMES.includes(theme) ? theme : DEFAULT_THEME,
      accent: ACCENTS.some(a => a.id === accent) ? accent : DEFAULT_ACCENT,
    }
  } catch {
    return { theme: DEFAULT_THEME, accent: DEFAULT_ACCENT }
  }
}

export function resolveTheme(pref) {
  if (pref === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return pref === 'light' ? 'light' : 'dark'
}

export function applyTheme(pref) {
  const resolved = resolveTheme(pref)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {
    // storage unavailable (private mode) - the theme still applies for this session
  }
}

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const mixWithWhite = (hex, amount) => {
  const [r, g, b] = hexToRgb(hex)
  const mix = c => Math.round(c + (255 - c) * amount)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

export function applyAccent(accentId) {
  const accent = ACCENTS.find(a => a.id === accentId) || ACCENTS[0]
  const [r, g, b] = hexToRgb(accent.hex)
  const style = document.documentElement.style

  style.setProperty('--accent-primary', accent.hex)
  style.setProperty('--accent-primary-hover', mixWithWhite(accent.hex, 0.2))
  style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
  style.setProperty('--gradient-primary', `linear-gradient(135deg, ${accent.hex}, var(--accent-secondary))`)
  style.setProperty('--border-color', `rgba(${r}, ${g}, ${b}, 0.18)`)
  style.setProperty('--border-glow', `rgba(${r}, ${g}, ${b}, 0.45)`)
  style.setProperty('--shadow-glow', `0 0 30px rgba(${r}, ${g}, ${b}, 0.2)`)

  try {
    localStorage.setItem(ACCENT_KEY, accent.id)
  } catch {
    // ignore storage errors
  }
}

