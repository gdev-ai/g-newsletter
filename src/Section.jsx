import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { Photo, Reveal, useMeta } from './shared.jsx'
import { ArticleHeader, Footer } from './Chrome.jsx'
import { supabase } from './lib/supabase.js'
import { useSite } from './lib/site.jsx'
import { cms, isCms } from './lib/cms.js'
import { pad2 } from './lib/edition.js'
import { BlockGrid } from './blocks/Blocks.jsx'

export { BlockGrid }

// Thin bar along the top showing how far through the page the reader is.
function ReadingProgress() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    let frame = 0
    const on = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        setPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0)
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', on); window.removeEventListener('resize', on) }
  }, [])
  return (
    <div aria-hidden="true" className="no-print pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px] mix-blend-difference">
      <div className="h-full origin-left bg-white" style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  )
}

const has = (v) => (typeof v === 'string' ? v.trim() !== '' : !!v)

// Small uppercase text used for the meta row, caption and band labels.
const micro = 'text-[clamp(11px,.52vw,14px)] uppercase tracking-[.16em]'

function Perspective({ to, dir, section }) {
  const prev = dir === 'prev'
  return (
    <Link
      to={to}
      className={`group flex min-h-[clamp(180px,11.5vw,320px)] flex-col justify-between gap-12 px-[5vw] py-[clamp(36px,2.6vw,72px)] transition-colors hover:bg-white/[.04] ${prev ? 'border-b border-white/15 md:border-b-0 md:border-r' : 'md:items-end md:text-right'}`}
    >
      <span className={`${micro} text-white/55`}>{prev ? 'Previous perspective' : 'Next perspective'}</span>
      <span className="font-display text-[clamp(24px,1.45vw,40px)] font-light tracking-[-.03em]">
        {prev && <span aria-hidden="true" className="mr-3 inline-block transition-transform duration-300 group-hover:-translate-x-1.5">←</span>}
        {section.title || section.short}
        {!prev && <span aria-hidden="true" className="ml-3 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>}
      </span>
    </Link>
  )
}

export default function Section({ quarter, sections, base }) {
  const { slug } = useParams()
  const { search } = useLocation()
  const { draft, brand } = useSite()
  const sid = new URLSearchParams(search).get('sid')
  const s = (sid && sections.find((x) => x.id === sid)) || sections.find((x) => x.slug === slug)
  const [fetched, setBlocks] = useState([])
  // Static editions carry their blocks inline; CMS editions load them from the database.
  const blocks = isCms ? (draft?.blocks?.[s?.id] || []) : (s?.blocks || fetched)
  useMeta({
    title: s ? `${s.title || s.short} — ${quarter.label} · ${brand.wordmark}` : '',
    description: s?.descr || s?.headline,
    image: s?.photo_url || quarter.content?.images?.hero,
    imageAlt: s?.title ? `${s.title}: cover image` : "",
    type: 'article',
  })

  useEffect(() => {
    if (!s || isCms || s.blocks) return undefined
    let live = true
    setBlocks([])
    supabase.from('section_blocks').select('*').eq('section_id', s.id).order('position')
      .then(({ data, error }) => live && !error && setBlocks(data || []))
    return () => { live = false }
  }, [s?.id])

  if (!s) return <Navigate to={base} replace />

  // Previous/next wrap around the issue, so every perspective links onward.
  const i = sections.indexOf(s)
  const many = sections.length > 1
  const prev = sections[(i - 1 + sections.length) % sections.length]
  const next = sections[(i + 1) % sections.length]

  // In the editor every slot stays visible so it can be clicked and filled in;
  // readers only see what has content. Indexes stay the original ones so CMS paths line up.
  const show = (v) => isCms || has(v)
  const body = (s.body || []).map((p, k) => [p, k]).filter(([p]) => show(p))
  const [lead, ...rest] = body
  const points = (s.points || []).map((pt, k) => [pt || [], k]).filter(([[t, d]]) => isCms || has(t) || has(d))

  const para = ([p, k], n) => (
    <Reveal as="p" key={k} delay={n * 80} {...cms(`s.${s.id}.body.${k}`)} className="text-[clamp(15px,.7vw,19px)] leading-[2.05] text-soot/90 [&+&]:mt-[1.6em]">{p}</Reveal>
  )
  const quote = show(s.quote) && (
    <Reveal as="blockquote" key="quote" {...cms(`s.${s.id}.quote`)} className="my-[clamp(48px,4.6vw,124px)] border-l border-ink pl-[clamp(20px,1.6vw,42px)] font-display text-[clamp(24px,2.05vw,56px)] font-light leading-[1.12] tracking-[-.035em] text-ink">
      “{s.quote}”
    </Reveal>
  )

  return (
    <>
      {!isCms && <ReadingProgress />}
      <ArticleHeader base={base} issueNo={pad2(quarter.issue_no)} />
      <main id="main" tabIndex={-1} className="outline-none">
        <section className="px-[6vw] pt-[clamp(40px,4.6vw,120px)]">
          <div className={`${micro} grid grid-cols-3 border-b border-ink/30 pb-[clamp(14px,1vw,24px)] text-soot/80`}>
            <span>{s.n || pad2(i + 1)} / {pad2(sections.length)}</span>
            <span className="text-center">{quarter.label}</span>
            <span className="text-right">{s.read_min ? `${s.read_min} min` : ''}</span>
          </div>
          <p {...cms(`s.${s.id}.title`)} className={`${micro} hero-in mt-[clamp(28px,3.1vw,84px)] font-semibold text-ink`} style={{ '--d': '80ms' }}>{s.title}</p>
          <h1 {...cms(`s.${s.id}.headline`)} className="hero-in mt-[clamp(16px,1.6vw,44px)] pb-[.08em] text-[clamp(48px,6vw,160px)] leading-[.88] tracking-[-.045em] md:max-w-[58vw]" style={{ '--d': '200ms' }}>
            {s.headline}
          </h1>
          {show(s.descr) && (
            <p {...cms(`s.${s.id}.descr`)} className="hero-in mt-8 font-display text-[clamp(18px,.9vw,26px)] font-light leading-[1.45] text-soot/80 md:ml-auto md:mt-[clamp(8px,.6vw,16px)] md:max-w-[39%]" style={{ '--d': '340ms' }}>
              {s.descr}
            </p>
          )}
          {s.links?.length > 0 && (
            <div className="hero-in mt-10 flex flex-wrap gap-3 md:ml-auto md:max-w-[39%]" style={{ '--d': '420ms' }}>
              {s.links.map((l, k) => {
                const ext = /^https?:\/\//i.test(l.url)
                return (
                  <a key={k} href={l.url} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={`inline-flex items-center gap-4 border border-ink px-5 py-3 text-[11px] uppercase tracking-[.13em] transition ${k === 0 ? 'bg-ink text-white hover:bg-transparent hover:text-ink' : 'hover:bg-ink hover:text-white'}`}>
                    {l.label} <span aria-hidden="true">{ext ? '↗' : '→'}</span>
                  </a>
                )
              })}
            </div>
          )}
        </section>

        {show(s.photo_url) && (
          <figure className="px-[3.5vw] pt-[clamp(48px,5vw,136px)]">
            <Photo cms={`s.${s.id}.photo_url`} src={s.photo_url} alt={s.title || ''} priority className="aspect-[4/3] w-full md:aspect-[2.86/1]" />
            {show(brand.photoCaption) && (
              <figcaption {...cms('brand.photoCaption')} className="mt-[clamp(12px,.8vw,22px)] text-[clamp(10px,.45vw,12px)] uppercase tracking-[.12em] text-soot/70">{brand.photoCaption}</figcaption>
            )}
          </figure>
        )}

        <section className="grid gap-y-10 px-[6vw] py-[clamp(72px,7vw,190px)] md:grid-cols-[minmax(0,26vw)_minmax(0,1fr)] md:gap-x-[10.4vw] md:pl-[12.1vw] md:pr-[12.1vw]">
          <div>
            {lead && (
              <Reveal as="p" {...cms(`s.${s.id}.body.${lead[1]}`)} className="font-display text-[clamp(30px,2.85vw,78px)] font-light leading-[1.1] tracking-[-.045em] text-ink">{lead[0]}</Reveal>
            )}
          </div>
          <div className="md:pt-[.4vw]">
            {rest.length ? [para(rest[0], 0), quote, ...rest.slice(1).map((r, n) => para(r, n + 1))] : quote}
          </div>
        </section>

        {blocks.length > 0 && (
          <section className="px-[3.5vw] pb-[clamp(72px,7vw,190px)]"><BlockGrid blocks={blocks} /></section>
        )}

        {points.length > 0 && (
          <section className="px-[6vw] pb-[clamp(72px,7vw,190px)]">
            <p className={`${micro} border-b border-ink/30 pb-4 text-soot/80`}>At a glance</p>
            <div className={`grid ${points.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {points.map(([[t, d], k], n) => (
                <Reveal key={k} delay={n * 100} className="border-b border-ink/15 py-10 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0">
                  <span className="text-[11px] text-soot/70">{pad2(n + 1)}</span>
                  {show(t) && <h3 {...cms(`s.${s.id}.points.${k}.0`)} className="mt-6 text-[clamp(28px,1.9vw,48px)]">{t}</h3>}
                  {show(d) && <p {...cms(`s.${s.id}.points.${k}.1`)} className="mt-3 max-w-[320px] text-[clamp(13px,.65vw,17px)] leading-[1.8] text-soot/90">{d}</p>}
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {many && (
          <nav aria-label="Perspectives" className="grid border-b border-white/15 bg-ink text-white md:grid-cols-2">
            <Perspective dir="prev" to={`${base}/section/${prev.slug}`} section={prev} />
            <Perspective dir="next" to={`${base}/section/${next.slug}`} section={next} />
          </nav>
        )}
      </main>
      <Footer />
    </>
  )
}
