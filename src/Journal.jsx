import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Arrow, Lines, Photo, Reveal } from './shared.jsx'
import { Header, Footer } from './Chrome.jsx'
import { useSite } from './lib/site.jsx'
import { cms } from './lib/cms.js'

const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

function Hero({ c }) {
  const h = c.hero
  return (
    <section id="top" {...cms('c.images.hero')} className="relative flex min-h-[760px] items-end overflow-hidden bg-ink text-white">
      <Photo src={c.images.hero} tone="hero" alt="" className="hero-img absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
      <div className="relative w-full px-[3.5vw] pb-14">
        <p {...cms('c.hero.eyebrow')} className="hero-in label !text-[9px]" style={{ '--d': '100ms' }}>{h.eyebrow}</p>
        <h1 {...cms('c.hero.title')} className="hero-in mt-6 pb-3 text-[clamp(64px,11vw,160px)]" style={{ '--d': '250ms' }}><Lines>{h.title}</Lines></h1>
        <div className="hero-in mt-6 flex flex-wrap items-end justify-between gap-8 border-t border-white/30 pt-7" style={{ '--d': '450ms' }}>
          <p {...cms('c.hero.sub')} className="font-display text-[19px] font-light leading-snug"><Lines>{h.sub}</Lines></p>
          <div className="flex flex-col items-start gap-5">
            <button {...cms('c.hero.cta')} className="btn" onClick={() => go('stories')}>{h.cta} <Arrow /></button>
            <button {...cms('c.hero.link')} className="link-line !justify-start" onClick={() => go('stories')}>{h.link}</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Intro({ c }) {
  const i = c.intro
  return (
    <section className="grid gap-10 border-b border-ink/15 px-[3.5vw] py-32 md:grid-cols-[1fr_2.2fr]">
      <p {...cms('c.intro.label')} className="label !text-[9px]">{i.label}</p>
      <div>
        <Reveal as="p" {...cms('c.intro.quote')} className="max-w-[860px] font-display text-[clamp(34px,4.2vw,60px)] font-light leading-[1.08] tracking-[-.04em]">{i.quote}</Reveal>
        <Reveal as="p" delay={150} {...cms('c.intro.note')} className="mt-14 max-w-[520px] text-[13px] leading-[1.8] text-soot/80 md:ml-[10%]">{i.note}</Reveal>
      </div>
    </section>
  )
}

function Stories({ c, base }) {
  const s = c.stories
  const [a, b, d] = s.cards
  const to = (slug) => `${base}/section/${slug}`
  return (
    <section id="stories" className="px-[3.5vw] py-24">
      <div className="flex justify-between border-b border-ink pb-3 text-[9px] uppercase tracking-[.14em] text-soot">
        <span {...cms('c.stories.label')}>{s.label}</span><span {...cms('c.stories.meta')}>{s.meta}</span>
      </div>

      <div className="mt-10 grid items-end gap-12 md:grid-cols-[1.4fr_1fr]">
        <Photo cms="c.images.transform" src={c.images.transform} tone="transform" className="aspect-[1.55] w-full">
          <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[8px] tracking-[.14em] text-ink">01 / 04</span>
        </Photo>
        <Reveal className="pb-4">
          <p {...cms('c.stories.feature.tag')} className="label !text-[9px] text-soot">{s.feature.tag}</p>
          <h2 {...cms('c.stories.feature.title')} className="mt-5 text-[clamp(44px,5.2vw,76px)]">{s.feature.title}</h2>
          <p {...cms('c.stories.feature.desc')} className="mt-6 max-w-[360px] text-[12px] leading-[1.8] text-soot/80">{s.feature.desc}</p>
          <Link {...cms('c.stories.feature.cta')} to={to(s.feature.slug)} className="link-line mt-8 w-[165px]">{s.feature.cta} <Arrow /></Link>
        </Reveal>
      </div>

      <div className="mt-28 grid items-start md:grid-cols-3">
        <Reveal as="article" className="pr-8">
          <Photo cms="c.images.walkway" src={c.images.walkway} tone="walkway" className="aspect-[1.05]" />
          <p {...cms('c.stories.cards.0.tag')} className="label !text-[9px] mt-5 px-5">{a.tag}</p>
          <h3 {...cms('c.stories.cards.0.title')} className="mt-10 px-5 text-[28px]">{a.title}</h3>
          <Link {...cms('c.stories.cards.0.cta')} to={to(a.slug)} className="link-line mt-12 ml-5 w-[190px] !border-transparent text-soot/70">{a.cta} <Arrow /></Link>
        </Reveal>

        <Reveal as="article" delay={120} {...cms('c.images.people')} className="relative -mt-2 aspect-[0.8] bg-ink text-white">
          <Photo src={c.images.people} tone="people" className="absolute inset-0 opacity-70" />
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <p {...cms('c.stories.cards.1.tag')} className="label !text-[9px] mb-5">{b.tag}</p>
            <h3 {...cms('c.stories.cards.1.title')} className="text-[34px]">{b.title}</h3>
            <p {...cms('c.stories.cards.1.desc')} className="mt-6 max-w-[250px] text-[11px] leading-[1.7] text-white/60">{b.desc}</p>
            <Link {...cms('c.stories.cards.1.cta')} to={to(b.slug)} className="link-line mt-8 w-[170px]">{b.cta} <Arrow /></Link>
          </div>
        </Reveal>

        <Reveal as="article" delay={240} className="pl-8">
          <Photo cms="c.images.blocks" src={c.images.blocks} tone="blocks" className="aspect-[1.05]" />
          <p {...cms('c.stories.cards.2.tag')} className="label !text-[9px] mt-5">{d.tag}</p>
          <h3 {...cms('c.stories.cards.2.title')} className="mt-10 text-[26px]">{d.title}</h3>
          <Link {...cms('c.stories.cards.2.cta')} to={to(d.slug)} className="link-line mt-12 w-[180px] !border-transparent">{d.cta} <Arrow /></Link>
        </Reveal>
      </div>
    </section>
  )
}

function Directory({ c, sections, base }) {
  return (
    <section id="sections" className="bg-ink px-[3.5vw] py-28 text-white">
      <div className="grid gap-10 md:grid-cols-[1fr_2.2fr]">
        <p {...cms('c.directory.label')} className="label !text-[9px] text-white/60">{c.directory.label}</p>
        <h2 {...cms('c.directory.title')} className="text-[clamp(48px,6vw,92px)] text-white/90"><Lines>{c.directory.title}</Lines></h2>
      </div>
      <div className="mt-20 border-t border-white/25">
        {sections.map(({ id, n, slug, title, descr }, i) => (
          <Reveal key={id} delay={(i % 5) * 60}>
            <Link to={`${base}/section/${slug}`} className="group grid w-full grid-cols-[48px_1fr_30px] items-center gap-6 border-b border-soot py-[25px] text-left transition-colors hover:bg-white/[.03] md:grid-cols-[70px_1.2fr_1fr_30px]">
              <span className="text-[9px] text-white/40">{n}</span>
              <span {...cms(`s.${id}.title`)} className="font-display text-[26px] font-light tracking-[-.03em] transition-transform duration-300 group-hover:translate-x-2">{title}</span>
              <span {...cms(`s.${id}.descr`)} className="hidden max-w-[360px] text-[11px] leading-[1.7] text-white/50 md:block">{descr}</span>
              <span className="justify-self-end transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><Arrow /></span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function AiCorner({ c }) {
  const [open, setOpen] = useState(false)
  const a = c.ai
  return (
    <section id="ideas" className="grid md:grid-cols-[1.12fr_1fr]">
      <Photo cms="c.images.ai" src={c.images.ai} tone="ai" className="min-h-[520px]" />
      <div className="flex flex-col justify-center px-[6vw] py-20">
        <p {...cms('c.ai.label')} className="label !text-[9px]">{a.label}</p>
        <Reveal as="h2" {...cms('c.ai.title')} className="mt-8 text-[clamp(44px,5vw,72px)] text-soot">{a.title}</Reveal>
        <p {...cms('c.ai.desc')} className="mt-8 max-w-[390px] text-[12.5px] leading-[1.8] text-soot/70">{a.desc}</p>
        <div className="mt-12 max-w-[390px] border-y border-ink/30">
          <button {...cms('c.ai.promptLabel')} onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between py-[18px] text-[10px] uppercase tracking-label transition-all duration-300 hover:pl-2">
            {a.promptLabel}
            <span className={`text-[14px] transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
          </button>
          <div className={`collapse ${open ? 'open' : ''}`}>
            <div>
              <p {...cms('c.ai.prompt')} className={`px-2 pb-6 text-[12px] leading-[1.8] text-soot transition-all duration-500 ${open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>{a.prompt}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Poll({ c, base }) {
  const p = c.poll
  const ch = c.challenge
  const [choice, setChoice] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <section className="grid bg-stone md:grid-cols-[1.4fr_1fr]">
      <div className="px-[6vw] py-24">
        <p {...cms('c.poll.label')} className="label !text-[9px]">{p.label}</p>
        <h2 {...cms('c.poll.question')} className="mt-8 text-[clamp(44px,5vw,72px)] text-soot">{p.question}</h2>
        {sent ? (
          <div className="mt-14 max-w-[615px] border-y border-soot/40 py-10">
            <span {...cms('c.poll.thanks')} className="font-display text-[30px] font-light">{p.thanks}</span>
            <p {...cms('c.poll.thanksNote')} className="mt-2 text-[12px] text-soot/70">{p.thanksNote}</p>
          </div>
        ) : (
          <form className="mt-14 max-w-[615px]" onSubmit={(e) => { e.preventDefault(); choice && setSent(true) }}>
            {p.options.map((o, i) => (
              <label key={i} className="flex cursor-pointer items-center justify-between border-t border-soot/30 px-1 py-[19px] font-display text-[15px] text-soot last:border-b">
                <input type="radio" name="poll" className="sr-only" onChange={() => setChoice(o)} />
                <span {...cms(`c.poll.options.${i}`)}>{o}</span>
                <i className={`h-[14px] w-[14px] rounded-full border border-soot/60 transition ${choice === o ? 'bg-ink shadow-[inset_0_0_0_3px_rgb(var(--c-stone))]' : ''}`} />
              </label>
            ))}
            <button {...cms('c.poll.submit')} disabled={!choice} className="btn btn-dark mt-12 !min-w-[198px] disabled:cursor-not-allowed disabled:opacity-40">
              {p.submit} <Arrow />
            </button>
          </form>
        )}
      </div>
      <Photo cms="c.images.challenge" src={c.images.challenge} tone="challenge" className="min-h-[460px] text-white">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-center px-10 py-16">
          <p {...cms('c.challenge.label')} className="label !text-[9px] mb-4">{ch.label}</p>
          <span {...cms('c.challenge.number')} className="font-display text-[120px] font-extralight leading-none tracking-[-.04em]">{ch.number}</span>
          <h3 {...cms('c.challenge.title')} className="mt-1 max-w-[360px] text-[34px] text-white">{ch.title}</h3>
          <p {...cms('c.challenge.desc')} className="mt-6 max-w-[320px] text-[11px] leading-[1.7] text-white/60">{ch.desc}</p>
          <Link {...cms('c.challenge.cta')} to={`${base}/section/${ch.slug}`} className="link-line mt-5 w-[200px]">{ch.cta} <Arrow /></Link>
        </div>
      </Photo>
    </section>
  )
}

function Archive({ c, current }) {
  const { quarters } = useSite()
  const list = quarters.filter((q) => q.is_published)
  const a = c.archive
  const tones = ['bg-ink text-white', 'bg-stone text-ink', 'text-ink']
  return (
    <section id="archive" className="px-[3.5vw] py-32">
      <div className="grid items-start gap-10 md:grid-cols-[1fr_2.2fr_1fr]">
        <p {...cms('c.archive.label')} className="label !text-[9px] pt-2">{a.label}</p>
        <h2 {...cms('c.archive.title')} className="text-[clamp(48px,5.4vw,80px)]">{a.title}</h2>
        <p {...cms('c.archive.desc')} className="max-w-[260px] text-[11.5px] leading-[1.7] text-soot/70">{a.desc}</p>
      </div>
      <div className="mt-20 grid gap-6 md:grid-cols-3">
        {list.map((q, i) => (
          <Reveal key={q.id} delay={i * 100}>
            <Link
              to={`/q/${q.slug}`}
              aria-label={`Open ${q.label} edition: ${q.title}`}
              className={`group flex aspect-[0.76] w-full flex-col justify-between p-6 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_50px_rgba(0,0,0,.14)] ${tones[i % 3]} ${q.slug === current ? 'ring-1 ring-ink ring-offset-4 ring-offset-paper' : ''}`}
            >
              <span className="text-[8px] uppercase tracking-[.14em] opacity-70">{q.slug === current ? 'Current edition' : 'Edition'}</span>
              <span className="font-display text-[clamp(110px,13vw,190px)] font-extralight leading-none tracking-[-.05em] transition-transform duration-500 group-hover:translate-x-2">{String(q.issue_no || q.label.slice(1, 2)).padStart(2, '0')}</span>
              <span className="text-[12px] leading-[1.6]">{q.label}<br />{q.title}</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default function Journal({ quarter, sections, base }) {
  const c = quarter.content
  return (
    <main>
      <Header base={base} issue={`Issue ${String(quarter.issue_no).padStart(2, '0')} — ${quarter.label}`} />
      <Hero c={c} />
      <Intro c={c} />
      <Stories c={c} base={base} />
      <Directory c={c} sections={sections} base={base} />
      <AiCorner c={c} />
      <Poll c={c} base={base} />
      <Archive c={c} current={quarter.slug} />
      <Footer />
    </main>
  )
}
