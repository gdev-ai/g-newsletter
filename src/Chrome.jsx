import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Wordmark } from './shared.jsx'
import { useSite } from './lib/site.jsx'

const nav = [['Explore', 'stories'], ['People', 'sections'], ['Ideas', 'ideas'], ['Archive', 'archive']]

// Scrolls to the #hash target, or to the top, on every navigation.
export function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 80)
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export function Header({ base, issue }) {
  const { brand } = useSite()
  const [open, setOpen] = useState(false)
  return (
    <header className="absolute inset-x-0 top-0 z-10 grid h-[92px] grid-cols-[1fr_auto_1fr] items-center border-b border-white/30 px-[3.5vw] text-white">
      <Link to={base} aria-label="Home" className="justify-self-start"><Wordmark /></Link>
      <div className="hidden text-center text-[8px] uppercase leading-[1.8] tracking-[.14em] md:block">
        <div data-cms="brand.headerTag1">{brand.headerTag1}</div><div>{issue}</div>
      </div>
      <nav className="hidden justify-self-end md:flex md:gap-9">
        {nav.map(([l, id]) => (
          <Link key={id} to={`${base}#${id}`} className="text-[10px] uppercase tracking-label opacity-90 transition hover:opacity-60">{l}</Link>
        ))}
      </nav>
      <button className="justify-self-end text-[10px] uppercase tracking-label md:hidden" onClick={() => setOpen(!open)}>
        {open ? 'Close' : 'Menu'}
      </button>
      {open && (
        <nav className="absolute inset-x-0 top-[92px] flex flex-col gap-5 bg-ink/95 px-[3.5vw] py-6 md:hidden">
          {nav.map(([l, id]) => (
            <Link key={id} to={`${base}#${id}`} onClick={() => setOpen(false)} className="text-left text-[11px] uppercase tracking-label">{l}</Link>
          ))}
        </nav>
      )}
    </header>
  )
}

export function Footer() {
  const { brand } = useSite()
  return (
    <footer className="bg-ink px-[3.5vw] pb-8 pt-20 text-white">
      <div className="grid items-start gap-8 md:grid-cols-3">
        <Wordmark className="!text-[22px]" />
        <div className="text-[8px] uppercase leading-[1.8] tracking-[.12em] text-white/50">
          <span data-cms="brand.footerNote1">{brand.footerNote1}</span><br /><span data-cms="brand.footerNote2">{brand.footerNote2}</span>
        </div>
        <div className="flex gap-8 text-[9px] uppercase tracking-[.12em] md:justify-end">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="border-b border-white pb-1">Back to top ↑</button>
        </div>
      </div>
      <div className="mt-24 border-t border-white/15 pt-6 text-[8px] uppercase tracking-[.12em] text-white/40" data-cms="brand.copyright">{brand.copyright}</div>
    </footer>
  )
}
