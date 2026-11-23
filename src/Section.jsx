import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { Arrow, Lines, Photo, Reveal } from './shared.jsx'
import { Header, Footer } from './Chrome.jsx'
import { supabase } from './lib/supabase.js'
import { useSite } from './lib/site.jsx'
import { cms, isCms } from './lib/cms.js'

// Renders the 12-column content grid for a section (also used by the admin preview).
export function BlockGrid({ blocks }) {
  if (!blocks?.length) return null
  return (
    <div className="grid grid-cols-1 gap-4 md:auto-rows-[96px] md:grid-cols-12">
      {blocks.map((b) => {
        const style = { '--cs': b.col_span, '--rs': b.row_span }
        const cell = 'md:[grid-column:span_var(--cs)] md:[grid-row:span_var(--rs)] min-h-[160px] md:min-h-0'
        const c = b.content || {}
        if (b.type === 'image')
          return (
            <figure key={b.id} style={style} data-cms={`b.${b.id}`} className={`${cell} relative overflow-hidden bg-stone`}>
              <Photo src={c.url} alt={c.alt} className="absolute inset-0" />
              {c.caption && <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-[10px] uppercase tracking-[.12em] text-white">{c.caption}</figcaption>}
            </figure>
          )
        if (b.type === 'heading')
          return <h3 key={b.id} style={style} data-cms={`b.${b.id}`} className={`${cell} flex items-end text-[clamp(32px,3.6vw,56px)]`}><Lines>{c.text}</Lines></h3>
        if (b.type === 'quote')
          return <blockquote key={b.id} style={style} data-cms={`b.${b.id}`} className={`${cell} flex items-center bg-ink p-8 font-display text-[clamp(22px,2.4vw,36px)] font-light leading-[1.15] tracking-[-.03em] text-white`}>“{c.text}”</blockquote>
        return <p key={b.id} style={style} data-cms={`b.${b.id}`} className={`${cell} overflow-hidden text-[14px] leading-[1.9] text-soot/80`}><Lines>{c.text}</Lines></p>
      })}
    </div>
  )
}

export default function Section({ quarter, sections, base }) {
  const { slug } = useParams()
  const { search } = useLocation()
  const { draft } = useSite()
  const sid = new URLSearchParams(search).get('sid')
  const s = (sid && sections.find((x) => x.id === sid)) || sections.find((x) => x.slug === slug)
  const [fetched, setBlocks] = useState([])
  const blocks = isCms ? (draft?.blocks?.[s?.id] || []) : fetched

  useEffect(() => {
    if (!s || isCms) return
    supabase.from('section_blocks').select('*').eq('section_id', s.id).order('position').then(({ data }) => setBlocks(data || []))
  }, [s?.id])

  if (!s) return <Navigate to={base} replace />

  const i = sections.indexOf(s)
  const prev = sections[(i - 1 + sections.length) % sections.length]
  const next = sections[(i + 1) % sections.length]
  const more = sections.filter((x) => x !== s).slice(0, 4)

  return (
    <main>
      <Header base={base} issue={`Issue ${String(quarter.issue_no).padStart(2, '0')} — ${quarter.label}`} />

      <section className="bg-ink px-[3.5vw] pb-20 pt-[170px] text-white">
        <p {...cms(`s.${s.id}.short`)} className="hero-in label !text-[9px] text-white/60" style={{ '--d': '80ms' }}>{s.n} — {s.short} · {s.read_min} min read</p>
        <h1 {...cms(`s.${s.id}.headline`)} className="hero-in mt-8 max-w-[1100px] pb-2 text-[clamp(48px,8vw,128px)]" style={{ '--d': '220ms' }}>{s.headline}</h1>
        <p {...cms(`s.${s.id}.descr`)} className="hero-in mt-10 max-w-[480px] font-display text-[19px] font-light leading-snug text-white/80" style={{ '--d': '380ms' }}>{s.descr}</p>
      </section>

      <Photo cms={`s.${s.id}.photo_url`} src={s.photo_url} alt={s.title} className="h-[56vh] min-h-[360px] w-full" />

      <section className="grid gap-10 px-[3.5vw] py-28 md:grid-cols-[1fr_2.2fr]">
        <div className="label !text-[9px] text-soot">
          <Link to={`${base}#sections`} className="border-b border-ink pb-1">← All sections</Link>
        </div>
        <div className="max-w-[720px]">
          {s.body.map((p, k) => (
            <Reveal as="p" key={k} delay={k * 80} {...cms(`s.${s.id}.body.${k}`)} className={k === 0 ? 'font-display text-[clamp(26px,2.6vw,38px)] font-light leading-[1.25] tracking-[-.03em]' : 'mt-8 text-[14px] leading-[1.9] text-soot/80'}>{p}</Reveal>
          ))}
        </div>
      </section>

      {blocks.length > 0 && (
        <section className="px-[3.5vw] pb-28"><BlockGrid blocks={blocks} /></section>
      )}

      <section className="bg-stone px-[3.5vw] py-28">
        <Reveal as="blockquote" {...cms(`s.${s.id}.quote`)} className="mx-auto max-w-[980px] text-center font-display text-[clamp(34px,4.6vw,68px)] font-light leading-[1.08] tracking-[-.04em] text-soot">“{s.quote}”</Reveal>
      </section>

      <section className="px-[3.5vw] py-24">
        <p className="label !text-[9px] text-soot">At a glance</p>
        <div className="mt-8 grid border-t border-ink md:grid-cols-3">
          {s.points.map(([t, d], k) => (
            <Reveal key={k} delay={k * 100} className="border-b border-ink/20 py-10 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0">
              <span className="text-[9px] text-soot/50">0{k + 1}</span>
              <h3 {...cms(`s.${s.id}.points.${k}.0`)} className="mt-6 text-[34px]">{t}</h3>
              <p {...cms(`s.${s.id}.points.${k}.1`)} className="mt-3 max-w-[260px] text-[12px] leading-[1.8] text-soot/70">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="grid border-y border-ink/20 md:grid-cols-2">
        <Link to={`${base}/section/${prev.slug}`} className="group border-b border-ink/20 px-[3.5vw] py-14 transition-colors hover:bg-ink hover:text-white md:border-b-0 md:border-r">
          <span className="label !text-[9px] opacity-60">← Previous · {prev.n}</span>
          <span className="mt-5 block font-display text-[32px] font-light tracking-[-.03em] transition-transform duration-300 group-hover:translate-x-2">{prev.short}</span>
        </Link>
        <Link to={`${base}/section/${next.slug}`} className="group px-[3.5vw] py-14 text-left transition-colors hover:bg-ink hover:text-white md:text-right">
          <span className="label !text-[9px] opacity-60">Next · {next.n} →</span>
          <span className="mt-5 block font-display text-[32px] font-light tracking-[-.03em] transition-transform duration-300 group-hover:-translate-x-2">{next.short}</span>
        </Link>
      </section>

      <section className="bg-ink px-[3.5vw] py-24 text-white">
        <p className="label !text-[9px] text-white/60">Keep reading</p>
        <div className="mt-10 border-t border-white/25">
          {more.map(({ n, slug: sl, title, descr }) => (
            <Link key={sl} to={`${base}/section/${sl}`} className="group grid grid-cols-[48px_1fr_30px] items-center gap-6 border-b border-soot py-[25px] transition-colors hover:bg-white/[.03] md:grid-cols-[70px_1.2fr_1fr_30px]">
              <span className="text-[9px] text-white/40">{n}</span>
              <span className="font-display text-[24px] font-light tracking-[-.03em] transition-transform duration-300 group-hover:translate-x-2">{title}</span>
              <span className="hidden max-w-[360px] text-[11px] leading-[1.7] text-white/50 md:block">{descr}</span>
              <span className="justify-self-end"><Arrow /></span>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  )
}
