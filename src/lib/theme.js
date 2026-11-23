export const DEFAULT_DESIGN = {
  paper: '#f1f0ec', home: '#ffffff', stone: '#d9d8d2', ink: '#111111', soot: '#3b3b3b',
  fontDisplay: 'Manrope', fontBody: 'Inter',
}

export const FONT_CHOICES = [
  'Manrope', 'Inter', 'DM Sans', 'Space Grotesk', 'Outfit', 'Plus Jakarta Sans',
  'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville', 'Montserrat',
]

const channels = (hex) => {
  const h = (hex || '#000000').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

// Applies design settings as CSS variables and loads the chosen Google fonts.
export function applyTheme(d = {}) {
  const t = { ...DEFAULT_DESIGN, ...d }
  const root = document.documentElement.style
  ;['paper', 'home', 'stone', 'ink', 'soot'].forEach((k) => root.setProperty(`--c-${k}`, channels(t[k])))
  root.setProperty('--font-display', `'${t.fontDisplay}'`)
  root.setProperty('--font-body', `'${t.fontBody}'`)

  const families = [...new Set([t.fontDisplay, t.fontBody])]
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@200;300;400;500;600`)
    .join('&')
  let link = document.getElementById('theme-fonts')
  if (!link) {
    link = document.createElement('link')
    link.id = 'theme-fonts'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`
}
