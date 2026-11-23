import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Wordmark } from './shared.jsx'
import { useSite } from './lib/site.jsx'

const NAV = [['Explore', 'sections'], ['People', 'people'], ['Ideas', 'ideas'], ['Archive', 'archive']]
// Archive only appears when there are earlier editions to show.
const navFor = (showArchive) => NAV.filter(([, id]) => id !== 'archive' || showArchive)

// Scrolls to the #hash target, or to the top, on every navigation (including re-clicking the same link,
// which gives a new location key). The target may not exist yet while a page loads, so keep looking briefly.
export function ScrollManager() {
  const { pathname, hash, key } = useLocation()
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return undefined } // scrollTo may return a Promise; never return it
    const id = decodeURIComponent(hash.slice(1))
    let tries = 0
    const timer = setInterval(() => {
      const el = document.getElementById(id)
      if (el || ++tries > 50) {
        clearInterval(timer)
        el?.scrollIntoView({ behavior: 'smooth' })
      }
    }, 60)
    return () => clearInterval(timer)
  }, [pathname, hash, key])
  return null
}

// Shows a compact bar once the reader has scrolled past the hero and starts scrolling back up.
function useCompactBar() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    const on = () => {
      const y = window.scrollY
      setShow(y > 640 && y < last - 2 ? true : y > last + 2 || y <= 640 ? false : (v) => v)
      last = y
    }
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return show
}

function NavLinks({ base, onPick, className, nav }) {
  return nav.map(([l, id]) => (
    <Link key={id} to={`${base}#${id}`} onClick={onPick} className={className}>{l}</Link>
  ))
}

export function Header({ base, issue, showArchive = true }) {
  const { brand } = useSite()
  const nav = navFor(showArchive)
  const [open, setOpen] = useState(false)
  const compact = useCompactBar()
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="absolute inset-x-0 top-0 z-10 grid h-[clamp(72px,5vw,128px)] grid-cols-[1fr_auto_1fr] items-center border-b border-white/30 px-[3.5vw] text-white">
        <Link to={base} aria-label="Home" className="justify-self-start"><Wordmark className="!text-[clamp(19px,1.1vw,30px)]" /></Link>
        <p className="hidden text-center text-[clamp(11px,.52vw,14px)] font-medium uppercase tracking-[.16em] md:block">
          <span data-cms="brand.headerTag1">{brand.headerTag1}</span><span className="ml-[2.2vw]">{issue}</span>
        </p>
        <nav aria-label="Main" className="hidden justify-self-end md:flex md:gap-9">
          <NavLinks nav={nav} base={base} className="text-[clamp(11px,.52vw,14px)] font-medium uppercase tracking-[.16em] transition hover:opacity-60" />
        </nav>
        <button
          className="-mr-3 justify-self-end px-3 py-3 text-[12px] uppercase tracking-label md:hidden"
          aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
        {open && (
          <nav id="mobile-nav" aria-label="Main" className="absolute inset-x-0 top-full flex flex-col bg-ink/95 px-[3.5vw] py-3 md:hidden">
            <NavLinks nav={nav} base={base} onPick={() => setOpen(false)} className="py-3 text-[13px] uppercase tracking-label" />
          </nav>
        )}
      </header>
      <div
        aria-hidden={!compact}
        className={`no-print fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/15 bg-ink/95 px-[3.5vw] text-white backdrop-blur transition-transform duration-300 ${compact ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <Link to={base} tabIndex={compact ? 0 : -1} aria-label="Home"><Wordmark className="!text-[16px]" /></Link>
        <span className="hidden text-[11px] uppercase tracking-[.14em] text-white/70 lg:block">{issue}</span>
        <nav aria-label="Quick" className="flex gap-5 md:gap-8">
          {nav.map(([l, id]) => (
            <Link key={id} to={`${base}#${id}`} tabIndex={compact ? 0 : -1} className={`text-[11px] uppercase tracking-label hover:opacity-60 ${id === 'sections' || id === 'archive' ? '' : 'hidden sm:inline'}`}>{l}</Link>
          ))}
        </nav>
      </div>
    </>
  )
}

// Solid header used on reading (section) pages: wordmark, issue tag, and a way back to the journal.
export function ArticleHeader({ base, issueNo }) {
  const { brand } = useSite()
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="grid h-[clamp(64px,5vw,128px)] grid-cols-[1fr_auto] items-center bg-ink px-[4.4vw] text-white md:grid-cols-[1fr_auto_1fr]">
        <Link to={base} aria-label="Home" className="justify-self-start"><Wordmark className="!text-[clamp(19px,1.1vw,30px)]" /></Link>
        <p className="hidden text-[clamp(11px,.52vw,14px)] font-medium uppercase tracking-[.16em] md:block">
          <span data-cms="brand.headerTag1">{brand.headerTag1}</span> · Issue {issueNo}
        </p>
        <Link to={base} className="justify-self-end border-b border-white pb-1 text-[clamp(11px,.52vw,14px)] font-medium uppercase tracking-[.16em] transition hover:opacity-70">
          Back to journal <span aria-hidden="true">←</span>
        </Link>
      </header>
    </>
  )
}

export function Footer() {
  const { brand } = useSite()
  return (
    <footer className="bg-ink px-[3.5vw] pb-8 pt-20 text-white">
      <div className="grid items-start gap-8 md:grid-cols-3">
        <Wordmark className="!text-[22px]" />
        <div className="text-[11px] uppercase leading-[1.8] tracking-[.12em] text-white/70 md:text-center">
          <span data-cms="brand.footerNote1">{brand.footerNote1}</span><br /><span data-cms="brand.footerNote2">{brand.footerNote2}</span>
        </div>
        <div className="flex flex-wrap gap-8 text-[11px] uppercase tracking-[.12em] md:justify-end">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="border-b border-white pb-1 uppercase">Back to top ↑</button>
        </div>
      </div>
      <div className="mt-24 border-t border-white/15 pt-6 text-[11px] uppercase tracking-[.12em] text-white/60" data-cms="brand.copyright">{brand.copyright}</div>
    </footer>
  )
}
