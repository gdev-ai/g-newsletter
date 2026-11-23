import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Arrow, Lines, Photo, Reveal, useMeta } from './shared.jsx'
import { Header, Footer } from './Chrome.jsx'
import { useSite } from './lib/site.jsx'
import { cms, isCms } from './lib/cms.js'
import { isLive, pad2 } from './lib/edition.js'
import { pollRespond, pollTally, store } from './lib/engagement.js'

// Alt text editors set per image in the CMS (content.imageAlts.<key>); decorative when empty.
const altOf = (c, key) => c.imageAlts?.[key] || ''

// Linked section, so story cards can show its read time and fall back to its description.
const sectionFor = (sections, slug) => sections.find((x) => x.slug === slug)
const withMin = (tag, sec) => (sec?.read_min && !/min/i.test(tag || '') ? `${tag} · ${sec.read_min} min` : tag)

function Hero({ c, base }) {
  const h = c.hero
  const feature = c.stories?.feature?.slug
  return (
    <section id="top" {...cms('c.images.hero')} className="relative flex min-h-[max(760px,100svh)] flex-col overflow-hidden bg-ink text-white">
      <Photo src={c.images.hero} tone="hero" alt={altOf(c, 'hero')} priority className="hero-img absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
      <div className="hero-in relative mt-[clamp(104px,8vw,190px)] flex justify-between gap-6 px-[3.5vw] text-[clamp(11px,.52vw,14px)] font-medium uppercase tracking-[.16em] text-white/85" style={{ '--d': '50ms' }}>
        <span {...cms('c.hero.topLeft')}>{h.topLeft}</span><span {...cms('c.hero.topRight')}>{h.topRight}</span>
      </div>
      <div className="relative mt-auto w-full px-[3.5vw] pb-14">
        <p {...cms('c.hero.eyebrow')} className="hero-in label" style={{ '--d': '100ms' }}>{h.eyebrow}</p>
        <h1 {...cms('c.hero.title')} className="hero-in mt-6 pb-3 text-[clamp(64px,8.6vw,230px)] !leading-[.86]" style={{ '--d': '250ms' }}><Lines>{h.title}</Lines></h1>
        <div className="hero-in mt-6 flex flex-wrap items-end justify-between gap-8 border-t border-white/30 pt-7" style={{ '--d': '450ms' }}>
          <p {...cms('c.hero.sub')} className="font-display text-[clamp(19px,1.05vw,28px)] font-light leading-snug"><Lines>{h.sub}</Lines></p>
          <div className="flex flex-col items-start gap-5">
            <Link {...cms('c.hero.cta')} className="btn" to={feature ? `${base}/section/${feature}` : `${base}#stories`}>{h.cta} <Arrow /></Link>
            <Link {...cms('c.hero.link')} className="link-line !justify-start" to={`${base}#stories`}>{h.link}</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Intro({ c }) {
  const i = c.intro
  return (
    <section className="grid gap-10 border-b border-ink/15 px-[3.5vw] py-32 md:grid-cols-[29.2vw_1fr]">
      <p {...cms('c.intro.label')} className="label">{i.label}</p>
      <div>
        <Reveal as="p" {...cms('c.intro.quote')} className="font-display text-[clamp(34px,3.3vw,88px)] font-light leading-[1.08] tracking-[-.04em] md:max-w-[44vw]">{i.quote}</Reveal>
        <Reveal as="p" delay={150} {...cms('c.intro.note')} className="mt-14 text-[clamp(13px,.7vw,18px)] leading-[1.8] text-soot/80 md:ml-[14vw] md:max-w-[29vw]">{i.note}</Reveal>
      </div>
    </section>
  )
}

// Glance strip layout by item count: grid classes, and [columns on md, columns on xl].
const GLANCE_COLS = { 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-3 xl:grid-cols-5', 6: 'md:grid-cols-3 xl:grid-cols-6' }
const GLANCE_SPLIT = { 3: [3, 3], 4: [4, 4], 5: [3, 5], 6: [3, 6] }

// "This quarter at a glance": short calls to action. Each item links to a section (slug), a page anchor
// or an outside site (url).
function Glance({ c, base }) {
  const g = c.glance
  if (!g?.items?.length) return null
  return (
    <section id="glance" className="px-[3.5vw] pt-24">
      <p {...cms('c.glance.label')} className="meta border-b border-ink pb-3 text-soot">{g.label}</p>
      <div className={`grid grid-cols-2 ${GLANCE_COLS[g.items.length] || GLANCE_COLS[6]}`}>
        {g.items.map((it, i) => {
          const inner = (
            <>
              <span {...cms(`c.glance.items.${i}.value`)} className="block font-display text-[clamp(40px,3.4vw,84px)] font-extralight leading-none tracking-[-.05em] tabular-nums">{it.value}</span>
              <span {...cms(`c.glance.items.${i}.label`)} className="mt-5 block text-[11px] font-medium uppercase tracking-label">{it.label}</span>
              <span {...cms(`c.glance.items.${i}.note`)} className="mt-2 block text-[13px] leading-[1.6] text-soot/85">{it.note}</span>
            </>
          )
          // Divider lines only between cells; the first cell of each row lines up with the label above.
          const [md, xl] = GLANCE_SPLIT[g.items.length] || GLANCE_SPLIT[6]
          const cls = [
            'group block h-full border-b border-ink/15 py-8 pr-6 transition-colors',
            i % 2 ? 'border-l pl-6' : 'pl-0',
            i % md ? 'md:border-l md:pl-6' : 'md:border-l-0 md:pl-0',
            i % xl ? 'xl:border-l xl:pl-6' : 'xl:border-l-0 xl:pl-0',
          ].join(' ')
          return (
            <Reveal key={i} delay={(i % 6) * 70}>
              {it.slug ? <Link to={`${base}/section/${it.slug}`} className={`${cls} hover:bg-ink/[.03]`}>{inner}</Link>
                : it.url ? <a href={it.url} {...(/^https?:/i.test(it.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={`${cls} hover:bg-ink/[.03]`}>{inner}</a>
                : <div className={cls}>{inner}</div>}
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

// Description shown on a story: its own, or else the linked section's (edited on that section).
function storyDesc(own, ownPath, sec) {
  if (own) return [own, cms(ownPath)]
  if (sec?.descr) return [sec.descr, cms(`s.${sec.id}.descr`)]
  return ['', cms(ownPath)]
}

// One highlighted story. The middle card of each row of three is the dark "quote" card.
function StoryCard({ card, i, sec, to, anchor }) {
  const p = `c.stories.cards.${i}`
  const [desc, descCms] = storyDesc(card.desc, `${p}.desc`, sec)
  if (i % 3 === 1)
    return (
      <Reveal as="article" delay={120} id={anchor} className="relative flex scroll-mt-24 flex-col justify-between overflow-hidden bg-ink p-[clamp(24px,1.7vw,44px)] text-white max-md:min-h-[460px]">
        {card.imageUrl ? <Photo cms={`${p}.imageUrl`} src={card.imageUrl} alt={card.imageAlt || ''} tone="people" className="absolute inset-0 opacity-40" /> : null}
        <p {...cms(`${p}.tag`)} className="label relative">{withMin(card.tag, sec)}</p>
        <div className="relative mt-16">
          <h3 {...cms(`${p}.title`)} className="text-[clamp(30px,2.45vw,64px)] !leading-[1.05]">{card.title}</h3>
          {desc ? <p {...descCms} className="mt-6 max-w-[85%] text-[clamp(13px,.8vw,20px)] leading-[1.7] text-white/80">{desc}</p> : null}
          <Link {...cms(`${p}.cta`)} to={to(card.slug)} className="link-line mt-10 w-full">{card.cta} <Arrow /></Link>
        </div>
      </Reveal>
    )
  return (
    <Reveal as="article" delay={(i % 3) * 120} className="flex flex-col">
      <Photo cms={`${p}.imageUrl`} src={card.imageUrl} alt={card.imageAlt || ''} tone={['walkway', 'people', 'blocks'][i % 3]} className="aspect-[1.94] w-full" />
      <div className="flex flex-1 flex-col pt-6 md:px-[1vw]">
        <p {...cms(`${p}.tag`)} className="label text-soot">{withMin(card.tag, sec)}</p>
        <h3 {...cms(`${p}.title`)} className="mt-6 text-[clamp(24px,1.6vw,42px)] !leading-[1.1]">{card.title}</h3>
        {desc ? <p {...descCms} className="mt-4 text-[clamp(13px,.8vw,20px)] leading-[1.7] text-ink">{desc}</p> : null}
        <Link {...cms(`${p}.cta`)} to={to(card.slug)} className="link-line mt-auto w-full pt-10">{card.cta} <Arrow /></Link>
      </div>
    </Reveal>
  )
}

function Stories({ c, sections, base }) {
  const s = c.stories
  const f = s.feature
  const fsec = sectionFor(sections, f.slug)
  const [fdesc, fdescCms] = storyDesc(f.desc, 'c.stories.feature.desc', fsec)
  const to = (slug) => `${base}/section/${slug}`
  const cards = s.cards || []
  return (
    <section id="stories" className="px-[3.5vw] py-24">
      <div className="meta flex justify-between gap-6 border-b border-ink pb-3 text-soot">
        <span {...cms('c.stories.label')}>{s.label}</span><span {...cms('c.stories.meta')}>{s.meta}</span>
      </div>

      <div className="mt-10 grid items-center gap-12 md:grid-cols-[62fr_38fr]">
        <Photo cms="c.images.transform" src={c.images.transform} alt={altOf(c, 'transform')} tone="transform" className="aspect-[1.72] w-full">
          <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[10px] tracking-[.14em] text-ink">01 / {pad2(cards.length + 1)}</span>
        </Photo>
        <Reveal>
          <p {...cms('c.stories.feature.tag')} className="label text-soot">{withMin(f.tag, fsec)}</p>
          <h2 {...cms('c.stories.feature.title')} className="mt-5 text-[clamp(40px,3.7vw,100px)]">{f.title}</h2>
          {fdesc ? <p {...fdescCms} className="mt-6 text-[clamp(13px,.8vw,20px)] leading-[1.8] text-soot/90 md:max-w-[30vw]">{fdesc}</p> : null}
          <Link {...cms('c.stories.feature.cta')} to={to(f.slug)} className="link-line mt-8 w-[clamp(165px,11vw,300px)]">{f.cta} <Arrow /></Link>
        </Reveal>
      </div>

      {cards.length > 0 && (
        <div className="mt-28 grid items-stretch gap-x-1 gap-y-16 md:grid-cols-[1.25fr_1fr_1.25fr] md:gap-y-1">
          {cards.map((card, i) => (
            <StoryCard key={i} card={card} i={i} sec={sectionFor(sections, card.slug)} to={to} anchor={i === 1 ? 'people' : undefined} />
          ))}
        </div>
      )}
    </section>
  )
}

function Directory({ c, sections, base }) {
  return (
    <section id="sections" className="bg-ink px-[3.5vw] py-28 text-white">
      <div className="grid gap-10 md:grid-cols-[33vw_1fr]">
        <p {...cms('c.directory.label')} className="label text-white/75">{c.directory.label}</p>
        <h2 {...cms('c.directory.title')} className="text-[clamp(44px,3.95vw,104px)] text-white/90"><Lines>{c.directory.title}</Lines></h2>
      </div>
      <div className="mt-20 border-t border-white/25">
        {sections.map(({ id, n, slug, title, descr }, i) => (
          <Reveal key={id} delay={(i % 5) * 60}>
            <Link to={`${base}/section/${slug}`} className="group grid w-full grid-cols-[48px_1fr_30px] items-center gap-6 border-b border-soot py-[25px] text-left transition-all duration-300 hover:bg-paper hover:px-4 hover:text-ink md:grid-cols-[5.1vw_46.8vw_1fr_30px]">
              <span className="text-[11px] text-white/60 transition-colors group-hover:text-ink/60">{n}</span>
              <span {...cms(`s.${id}.title`)} className="font-display text-[clamp(26px,1.6vw,44px)] font-light tracking-[-.03em]">{title}</span>
              <span {...cms(`s.${id}.descr`)} className="hidden max-w-[30vw] text-[clamp(13px,.7vw,18px)] leading-[1.7] text-white/70 transition-colors group-hover:text-ink/75 md:block">{descr}</span>
              <span className="justify-self-end transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><Arrow /></span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function CopyPrompt({ text }) {
  const [done, setDone] = useState('')
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone('Copied') } catch { setDone('Select the text and press Ctrl+C') }
    setTimeout(() => setDone(''), 2200)
  }
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-3 border border-ink px-4 py-2.5 text-[11px] uppercase tracking-label transition hover:bg-ink hover:text-white">
      <span aria-live="polite">{done || 'Copy prompt'}</span><span aria-hidden="true">⧉</span>
    </button>
  )
}

function AiCorner({ c, base }) {
  const [open, setOpen] = useState(false)
  const a = c.ai
  return (
    <section id="ideas" className="grid md:grid-cols-[1.3fr_1fr]">
      <Photo cms="c.images.ai" src={c.images.ai} alt={altOf(c, 'ai')} tone="ai" className="min-h-[520px]" />
      <div className="flex flex-col justify-center px-[5vw] py-20">
        <p {...cms('c.ai.label')} className="label">{a.label}</p>
        <Reveal as="h2" {...cms('c.ai.title')} className="mt-8 text-[clamp(40px,3.9vw,104px)] text-ink">{a.title}</Reveal>
        <p {...cms('c.ai.desc')} className="mt-8 text-[clamp(13px,.7vw,18px)] leading-[1.8] text-soot/90 md:max-w-[31vw]">{a.desc}</p>
        <div className="mt-12 w-full border-y border-ink/30 md:max-w-[31vw]">
          <button {...cms('c.ai.promptLabel')} onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between py-[18px] text-[11px] uppercase tracking-label transition-all duration-300 hover:pl-2">
            {a.promptLabel}
            <span className={`text-[14px] transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
          </button>
          <div className={`collapse ${open ? 'open' : ''}`}>
            <div>
              <div className={`px-2 pb-6 transition-all duration-500 ${open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
                <p {...cms('c.ai.prompt')} className="whitespace-pre-line text-[13px] leading-[1.8] text-soot">{a.prompt}</p>
                <div className="mt-5"><CopyPrompt text={a.prompt} /></div>
              </div>
            </div>
          </div>
        </div>
        {a.responsible && (
          <p {...cms('c.ai.responsible')} className="mt-8 border-l-2 border-[#334dd2] pl-4 text-[12px] leading-[1.7] text-soot/90 md:max-w-[31vw]">
            <strong className="font-semibold text-ink">Use AI responsibly. </strong>{a.responsible}
          </p>
        )}
        {a.moreSlug && <Link {...cms('c.ai.moreLabel')} to={`${base}/section/${a.moreSlug}`} className="link-line mt-8 w-[clamp(280px,17vw,380px)] whitespace-nowrap">{a.moreLabel} <Arrow /></Link>}
      </div>
    </section>
  )
}

// Remembers in this browser that a vote was cast, so readers see the results on return.
// The database also keeps one response per browser (see poll_respond in supabase/engagement.sql).
const pollKey = (slug) => `poll-vote:${slug}`
const myVote = (slug) => store.get(pollKey(slug)) || ''

// Live tallies for this edition. Counts only; never who voted. Only this poll's options are shown.
function PollResults({ options, mine, count }) {
  if (!count) return null
  const total = options.reduce((n, o) => n + (count[o] || 0), 0)
  if (!total) return null
  return (
    <ul className="mt-8 space-y-4" aria-label="Results so far">
      {options.map((o) => {
        const pct = Math.round(((count[o] || 0) / total) * 100)
        return (
          <li key={o}>
            <div className="flex justify-between text-[13px] text-soot">
              <span>{o}{o === mine && <span className="ml-2 text-[11px] uppercase tracking-[.12em] text-soot/80">· Your vote</span>}</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="mt-2 h-[3px] bg-soot/15"><div className="h-full bg-ink transition-[width] duration-700" style={{ width: `${pct}%` }} /></div>
          </li>
        )
      })}
      <li className="text-[11px] uppercase tracking-[.12em] text-soot/80">{total} {total === 1 ? 'vote' : 'votes'} so far</li>
    </ul>
  )
}

function Poll({ c, base, quarter }) {
  const p = c.poll
  const ch = c.challenge
  const [choice, setChoice] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [mine, setMine] = useState(() => myVote(quarter.slug))
  const sent = !!mine
  const [count, setCount] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // A returning voter sees the latest results.
  useEffect(() => {
    if (isCms || !mine) return undefined
    let live = true
    pollTally(quarter.slug).then((t) => live && setCount(t)).catch(() => {})
    return () => { live = false }
  }, [quarter.slug, mine])
  const submit = async (e) => {
    e.preventDefault()
    if (!choice || busy) return
    setBusy(true); setError('')
    try {
      setCount(await pollRespond(quarter.slug, choice, suggestion))
      store.set(pollKey(quarter.slug), choice)
      setMine(choice)
    } catch {
      setError('Your vote could not be sent. Please try again.')
    }
    setBusy(false)
  }
  return (
    <section id="poll" className="grid scroll-mt-20 bg-stone md:grid-cols-[1.75fr_1fr]">
      <div className="px-[6vw] py-24">
        <p {...cms('c.poll.label')} className="label">{p.label}</p>
        <h2 {...cms('c.poll.question')} className="mt-8 text-[clamp(40px,3.9vw,104px)] text-ink">{p.question}</h2>
        {sent ? (
          <div className="mt-14 max-w-[615px] border-y border-soot/40 py-10">
            <span {...cms('c.poll.thanks')} className="font-display text-[30px] font-light">{p.thanks}</span>
            <p {...cms('c.poll.thanksNote')} className="mt-2 text-[13px] text-soot/90">{p.thanksNote}</p>
            <PollResults options={p.options} mine={mine} count={count} />
          </div>
        ) : (
          <form className="mt-14 max-w-[615px]" onSubmit={submit}>
            <fieldset disabled={busy}>
              <legend className="sr-only">{p.question}</legend>
              {p.options.map((o, i) => (
                <label key={i} className="flex cursor-pointer items-center justify-between border-t border-soot/30 px-1 py-[19px] font-display text-[15px] text-soot last:border-b">
                  <input type="radio" name="poll" className="peer sr-only" checked={choice === o} onChange={() => setChoice(o)} />
                  <span {...cms(`c.poll.options.${i}`)}>{o}</span>
                  <i className={`h-[14px] w-[14px] rounded-full border border-soot/60 transition peer-focus-visible:ring-2 peer-focus-visible:ring-ink ${choice === o ? 'bg-ink shadow-[inset_0_0_0_3px_rgb(var(--c-stone))]' : ''}`} />
                </label>
              ))}
              {p.suggestLabel && (
                <label className="mt-8 block">
                  <span {...cms('c.poll.suggestLabel')} className="label text-soot">{p.suggestLabel}</span>
                  <textarea
                    value={suggestion} onChange={(e) => setSuggestion(e.target.value)} maxLength={500} rows={2}
                    placeholder="A story, a team or a topic you’d like to read about"
                    className="mt-3 w-full resize-y border-b border-soot/40 bg-transparent py-2 text-[14px] text-ink placeholder:text-soot/50 focus:border-ink focus:outline-none"
                  />
                </label>
              )}
            </fieldset>
            {error && <p role="alert" className="mt-6 text-[12px] text-red-700">{error}</p>}
            <button {...cms('c.poll.submit')} disabled={!choice || busy} className="btn btn-dark mt-12 !min-w-[198px] disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? 'Sending…' : p.submit} <Arrow />
            </button>
          </form>
        )}
      </div>
      <Photo cms="c.images.challenge" src={c.images.challenge} alt={altOf(c, 'challenge')} tone="challenge" className="min-h-[460px] text-white">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-between px-[clamp(28px,2.4vw,64px)] py-[clamp(40px,3vw,80px)]">
          <p {...cms('c.challenge.label')} className="label">{ch.label}</p>
          <div className="mt-24">
          <span {...cms('c.challenge.number')} className="font-display text-[clamp(110px,8.3vw,220px)] font-extralight leading-none tracking-[-.04em]">{ch.number}</span>
          <h3 {...cms('c.challenge.title')} className="mt-1 max-w-[360px] text-[34px] text-white">{ch.title}</h3>
          <p {...cms('c.challenge.desc')} className="mt-6 max-w-[320px] text-[13px] leading-[1.7] text-white/85">{ch.desc}</p>
          <Link {...cms('c.challenge.cta')} to={`${base}/section/${ch.slug}`} className="link-line mt-5 w-[200px]">{ch.cta} <Arrow /></Link>
          </div>
        </div>
      </Photo>
    </section>
  )
}

// Other live editions, newest first. Readers land on the current one, so it isn't repeated here.
const otherEditions = (quarters, current) => quarters.filter((q) => q.slug !== current && isLive(q))

function Archive({ c, list }) {
  const a = c.archive
  if (!list.length)
    return isCms ? <p className="px-[3.5vw] py-16 text-[13px] text-soot/80">The archive (past editions) appears here once another edition is live.</p> : null
  const tones = ['bg-stone text-ink', 'bg-white text-ink', 'bg-ink text-white']
  return (
    <section id="archive" className="px-[3.5vw] py-32">
      <div className="grid items-end gap-10 md:grid-cols-[28.3vw_1fr_23.2vw]">
        <p {...cms('c.archive.label')} className="label pb-3">{a.label}</p>
        <h2 {...cms('c.archive.title')} className="text-[clamp(44px,3.95vw,104px)]">{a.title}</h2>
        <p {...cms('c.archive.desc')} className="pb-3 text-[clamp(13px,.7vw,18px)] leading-[1.7] text-soot/90">{a.desc}</p>
      </div>
      <div className={`mt-20 grid gap-1 ${list.length === 1 ? 'max-w-[420px]' : list.length === 2 ? 'sm:grid-cols-2 lg:max-w-[66%]' : 'sm:grid-cols-2 md:grid-cols-3'}`}>
        {list.map((q, i) => (
          <Reveal key={q.id} delay={i * 100}>
            <Link
              to={`/q/${q.slug}`}
              aria-label={`Open ${q.label} edition: ${q.title}`}
              className={`group flex aspect-[0.76] w-full flex-col justify-between p-[clamp(24px,1.7vw,44px)] text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_50px_rgba(0,0,0,.14)] ${tones[i % 3]}`}
            >
              <span {...cms('c.archive.cardLabel')} className="text-[clamp(11px,.52vw,14px)] uppercase tracking-[.14em] opacity-80">{a.cardLabel}</span>
              <span className="font-display text-[clamp(110px,11.8vw,320px)] font-extralight leading-none tracking-[-.05em] transition-transform duration-500 group-hover:translate-x-2">{pad2(q.issue_no || q.label.slice(1, 2))}</span>
              <span className="text-[clamp(13px,.7vw,18px)] leading-[1.6]">{q.label}<br />{q.title}</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default function Journal({ quarter, sections, base }) {
  const c = quarter.content
  const { brand, quarters } = useSite()
  const past = otherEditions(quarters, quarter.slug)
  useMeta({
    title: `${quarter.title} — ${quarter.label} · ${brand.wordmark}`,
    description: c.hero?.sub?.replace(/\s+/g, ' ') || c.intro?.note,
    image: c.images?.hero,
    imageAlt: c.imageAlts?.hero || `${quarter.title}: cover image`,
  })
  return (
    <>
      <Header base={base} issue={`Issue ${pad2(quarter.issue_no)} — ${quarter.label}`} showArchive={past.length > 0} />
      <main id="main" tabIndex={-1} className="bg-home outline-none">
      <Hero c={c} base={base} />
      <Intro c={c} />
      <Glance c={c} base={base} />
      <Stories c={c} sections={sections} base={base} />
      <Directory c={c} sections={sections} base={base} />
      <AiCorner c={c} base={base} />
      <Poll c={c} base={base} quarter={quarter} />
      <Archive c={c} list={past} />
      </main>
      <Footer />
    </>
  )
}
