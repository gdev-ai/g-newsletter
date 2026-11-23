import { useEffect, useRef, useState } from 'react'
import { useSite } from './lib/site.jsx'

export const Arrow = () => <span aria-hidden="true">↗</span>

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

export function Photo({ src, tone = 'default', alt = '', className = '', cms, children }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return (
    <div data-cms={cms} className={`${className.includes('absolute') ? '' : 'relative'} overflow-hidden ${className}`} style={{ background: tones[tone] || tones.default }}>
      {src && !failed && (
        <img src={src} alt={alt} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {children}
    </div>
  )
}

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
