// Vercel function: serves the app's index.html with link-preview tags (title, description, image)
// filled in for the edition or article in the URL, so Slack, WhatsApp, Teams and LinkedIn show the
// right card. Browsers get the same page and the app takes over as usual.
//
// Routed from vercel.json:  /  (current edition),  /q/:q  and  /q/:q/section/:slug.
// On Vercel the built page is dist/app.html (see vite.config.js).
// Needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Vercel project's environment variables.
// Reads only what anonymous visitors may read (row-level security), so drafts never leak into previews.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { editionVars, fillDeep, isLive, withContentDefaults } from '../src/lib/edition.js'
import { STATIC_SITE } from '../src/content/index.js'

// Same switch as the app (src/lib/site.jsx): static content unless VITE_CONTENT_SOURCE=supabase.
const STATIC = (process.env.VITE_CONTENT_SOURCE || '') !== 'supabase'

const SB_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

let template = null // built page, cached per function instance

async function loadTemplate(origin) {
  if (template) return template
  try {
    template = await readFile(join(process.cwd(), 'dist', 'app.html'), 'utf8') // bundled via includeFiles
  } catch {
    const r = await fetch(`${origin}/app.html`)
    if (!r.ok) throw new Error(`app.html: ${r.status}`)
    template = await r.text()
  }
  return template
}

async function rest(path) {
  if (!SB_URL || !SB_KEY) return []
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    signal: AbortSignal.timeout(2500),
  })
  return r.ok ? r.json() : []
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
// The stock hero photo is too heavy for WhatsApp previews (over ~600 KB); returning '' keeps the
// default share-card.jpg in index.html, which is the same photo prepared at 1200×630.
const absolute = (url, origin) =>
  !url || /^\/?images\/hero\.(png|webp)$/i.test(url) ? '' : /^https?:\/\//i.test(url) ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\s+${attr}="${key.replace(/[.:]/g, '\\$&')}"\\s+content="[^"]*"\\s*/?>`, 'i')
  return html.replace(re, `<meta ${attr}="${key}" content="${esc(value)}" />`)
}
const dropMeta = (html, key) => html.replace(new RegExp(`\\s*<meta\\s+property="${key}"[^>]*>`, 'i'), '')

// Works out the preview for the URL; null keeps the site-wide defaults.
async function previewFor(q, slug, origin) {
  // No edition in the URL: the newest live one, as the home page shows.
  const quarter = STATIC
    ? (q ? STATIC_SITE.editions.find((x) => x.slug === q) : STATIC_SITE.editions.find((x) => isLive(x)))
    : q
      ? (await rest(`quarters?slug=eq.${encodeURIComponent(q)}&select=*&limit=1`))[0]
      : (await rest('quarters?select=*&order=sort.desc&limit=20')).find((x) => isLive(x))
  if (!quarter || !isLive(quarter)) return null
  const [settings] = STATIC ? [{ value: STATIC_SITE.brand }] : await rest('site_settings?key=eq.brand&select=value&limit=1')
  const wordmark = settings?.value?.wordmark || 'G Developments'
  const content = withContentDefaults(quarter.content)
  const vars = editionVars({ ...quarter, content })
  const c = fillDeep(content, vars)
  const page = q ? `${origin}/q/${encodeURIComponent(q)}` : `${origin}/`
  const base = `${origin}/q/${encodeURIComponent(quarter.slug)}`

  if (!slug)
    return {
      title: `${quarter.title} — ${quarter.label} · ${wordmark}`,
      description: oneLine(c.hero?.sub || c.intro?.note),
      image: absolute(c.images?.hero, origin),
      imageAlt: c.imageAlts?.hero || `${quarter.title}: cover image`,
      url: page,
      type: 'website',
    }

  const [raw] = STATIC
    ? quarter.sections.filter((x) => x.slug === slug)
    : await rest(`sections?quarter_id=eq.${quarter.id}&slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`)
  if (!raw) return null
  const s = fillDeep(raw, vars)
  return {
    title: `${s.title || s.short} — ${quarter.label} · ${wordmark}`,
    description: oneLine(s.descr || s.headline),
    image: absolute(s.photo_url || c.images?.hero, origin),
    imageAlt: s.title ? `${s.title}: cover image` : '',
    url: `${base}/section/${encodeURIComponent(slug)}`,
    type: 'article',
  }
}

export function render(html, p) {
  if (!p) return html
  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(p.title)}</title>`)
  out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${esc(p.url)}" />`)
  const tags = [
    ['name', 'description', p.description], ['property', 'og:title', p.title], ['property', 'og:description', p.description],
    ['property', 'og:url', p.url], ['property', 'og:type', p.type], ['name', 'twitter:title', p.title], ['name', 'twitter:description', p.description],
  ]
  if (p.image) {
    tags.push(['property', 'og:image', p.image], ['property', 'og:image:alt', p.imageAlt], ['name', 'twitter:image', p.image], ['name', 'twitter:image:alt', p.imageAlt])
    // The fixed size/type in index.html describe the default share card, not this image.
    for (const k of ['og:image:width', 'og:image:height', 'og:image:type']) out = dropMeta(out, k)
  }
  for (const [attr, key, value] of tags) if (value) out = setMeta(out, attr, key, value)
  return out
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const origin = (process.env.VITE_SITE_URL || `https://${host}`).replace(/\/+$/, '')
  const { q, slug } = req.query || {}
  let html
  try {
    html = await loadTemplate(origin)
  } catch (e) {
    res.status(502).send('The journal is temporarily unavailable.')
    return
  }
  let preview = null
  try {
    preview = await previewFor(q ? String(q) : '', q && slug ? String(slug) : '', origin)
  } catch {
    // Supabase slow or unreachable: serve the page with the default preview rather than failing.
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.status(200).send(render(html, preview))
}
