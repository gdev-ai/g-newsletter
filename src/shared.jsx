import { useEffect, useRef, useState } from 'react'
import { useSite } from './lib/site.jsx'
import { ArrowUpRight } from 'lucide-react'

export const Arrow = () => <ArrowUpRight aria-hidden="true" className="inline-block h-[1em] w-[1em] align-[-0.125em]" strokeWidth={1.75} />

// Full-screen message used for loading, "not found" and error states.
export function StatusScreen({ title, detail, onRetry, busy }) {
  return (
    <div role={busy ? 'status' : 'alert'} className="grid min-h-screen place-items-center bg-ink px-6 text-center text-white">
      <div className={busy ? 'hero-in' : ''} style={busy ? { '--d': '400ms' } : undefined}>
        <p className="text-[11px] uppercase tracking-label text-white/60">{title}</p>
        {detail && <p className="mx-auto mt-4 max-w-[420px] text-[13px] leading-[1.7] text-white/50">{detail}</p>}
        {onRetry && (
          <button onClick={onRetry} className="mt-8 border-b border-white pb-1 text-[10px] uppercase tracking-label">Try again</button>
        )}
      </div>
    </div>
  )
}

// Multi-line text from the CMS: "\n" becomes a line break.
export const Lines = ({ children }) => <span className="whitespace-pre-line">{children}</span>

// Photo: shows `src` when set, otherwise a tonal gradient placeholder.
const tones = {
  hero: 'linear-gradient(120deg,#1a1410,#6b4a2c 55%,#c98a4b)',
  transform: 'linear-gradient(160deg,#0d0f10,#4a5a5e 60%,#a9b6b8)',
  walkway: 'linear-gradient(160deg,#b9b6ae,#6e6a62)',
  people: 'linear-gradient(160deg,#16120e,#4a3d31)',
  blocks: 'linear-gradient(160deg,#cfccc4,#7d776b)',
  ai: 'linear-gradient(160deg,#c9b9a3,#6b5a45)',
  challenge: 'linear-gradient(160deg,#241c15,#6a5642)',
  default: 'linear-gradient(160deg,#cfccc4,#7d776b)',
}

// Bundled images (/images/x.png) also ship as smaller WebP copies, offered first to browsers that support them.
const webpFor = (src) => (/^\/images\/[^?#]+\.png$/i.test(src || '') ? src.replace(/\.png$/i, '.webp') : null)

export function Photo({ src, tone = 'default', alt = '', className = '', cms, priority = false, children }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  const webp = webpFor(src)
  const img = (
    <img
      src={src} alt={alt} onError={() => setFailed(true)}
      loading={priority ? 'eager' : 'lazy'} decoding="async" fetchpriority={priority ? 'high' : undefined}
      className="absolute inset-0 h-full w-full object-cover"
    />
  )
  return (
    <div data-cms={cms} className={`${className.includes('absolute') ? '' : 'relative'} overflow-hidden ${className}`} style={{ background: tones[tone] || tones.default }}>
      {src && !failed && (webp ? <picture><source srcSet={webp} type="image/webp" />{img}</picture> : img)}
      {children}
    </div>
  )
}

// Keeps the tab title and link-sharing tags (Open Graph / Twitter) in step with the page shown.
// Browsers' share sheets and JS-aware crawlers read these; static crawlers see the defaults in index.html.
const META = [
  ['name', 'description', 'description'], ['property', 'og:title', 'title'], ['property', 'og:description', 'description'],
  ['property', 'og:image', 'image'], ['property', 'og:image:alt', 'imageAlt'], ['property', 'og:url', 'url'], ['property', 'og:type', 'type'],
  ['name', 'twitter:title', 'title'], ['name', 'twitter:description', 'description'], ['name', 'twitter:image', 'image'], ['name', 'twitter:image:alt', 'imageAlt'],
]
const abs = (u) => { try { return u ? new URL(u, window.location.origin).href : '' } catch { return '' } }
const clip = (t, n = 200) => (t && t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t || '')

export function useMeta({ title, description, image, imageAlt, type = 'website' }) {
  const url = typeof window === 'undefined' ? '' : window.location.origin + window.location.pathname
  useEffect(() => {
    if (!title) return undefined
    const vals = { title, description: clip(description), image: abs(image), imageAlt: imageAlt || '', url, type }
    const undo = [() => { document.title = before }]
    const before = document.title
    document.title = title
    for (const [attr, key, field] of META) {
      if (!vals[field] && field !== 'imageAlt') continue
      let el = document.head.querySelector(`meta[${attr}="${key}"]`)
      const created = !el
      if (created) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
      const prev = el.getAttribute('content')
      el.setAttribute('content', vals[field])
      // When the image changes, the default card's fixed size/type no longer applies.
      undo.push(() => (created ? el.remove() : el.setAttribute('content', prev)))
    }
    const dims = vals.image ? [...document.head.querySelectorAll('meta[property^="og:image:"]:not([property="og:image:alt"])')] : []
    dims.forEach((el) => { el.dataset.off = el.getAttribute('content'); el.removeAttribute('content') })
    undo.push(() => dims.forEach((el) => el.setAttribute('content', el.dataset.off)))
    const canon = document.head.querySelector('link[rel="canonical"]')
    const canonBefore = canon?.getAttribute('href')
    canon?.setAttribute('href', url)
    undo.push(() => canon?.setAttribute('href', canonBefore))
    return () => undo.reverse().forEach((f) => f())
  }, [title, description, image, imageAlt, type, url])
}

export const useTitle = (title) => useMeta({ title })

// Reveal: one-time fade/slide in when scrolled into view.
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return setSeen(true)
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setSeen(true), io.disconnect()),
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} style={{ '--d': `${delay}ms` }} className={`reveal ${seen ? 'in' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function Wordmark({ className = '' }) {
  const { brand } = useSite()
  if (brand.logoUrl) return <img data-cms="brand.logoUrl" src={brand.logoUrl} alt={brand.wordmark} className="h-7 w-auto" />
  return <span data-cms="brand.wordmark" className={`font-display text-[19px] font-medium tracking-[-.02em] ${className}`}>{brand.wordmark}</span>
}
