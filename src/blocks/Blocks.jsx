import { lazy, Suspense, useState } from 'react'
import { Lines, Photo } from '../shared.jsx'
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react'

const Sudoku = lazy(() => import('./Sudoku.jsx'))

// Block types a section's 12-column grid can hold, with the content each one reads.
// Text-like blocks size to their content; row_span is the minimum height on desktop (96px a row).
export const BLOCK_TYPES = {
  text: { label: 'Text', content: { text: '' } },
  heading: { label: 'Heading', content: { text: '' } },
  quote: { label: 'Quote', content: { text: '', by: '' } },
  image: { label: 'Image', content: { url: '', alt: '', caption: '' } },
  stat: { label: 'Stat', content: { value: '', label: '', note: '' } },
  steps: { label: 'Steps', content: { title: '', items: [['', '']] } },
  prompt: { label: 'AI prompt', content: { label: 'Try this prompt', title: '', prompt: '', note: '' } },
  tip: { label: 'AI weekly tip', content: { week: '', title: '', idea: '', items: [['', '']], instead: '', better: '', prompt: '', task: '', takeaway: '' } },
  link: { label: 'Link card', content: { tag: '', title: '', desc: '', url: '', cta: 'Open' } },
  video: { label: 'Video', content: { url: '', caption: '', poster: '' } },
  quiz: { label: 'Quiz', content: { question: '', options: ['', ''], answer: 0, explain: '' } },
  note: { label: 'Note', content: { title: '', text: '', tone: 'info' } },
  challenge: { label: 'Challenge', content: { edition: '', title: 'The G Challenge', intro: '', prize: '' } },
}

const micro = 'text-[11px] uppercase tracking-label'
const has = (v) => (typeof v === 'string' ? v.trim() !== '' : !!v)

function Quote({ c }) {
  return (
    <blockquote className="flex h-full flex-col justify-center bg-ink p-8 text-white">
      <p className="font-display text-[clamp(22px,2.4vw,36px)] font-light leading-[1.15] tracking-[-.03em]">“{c.text}”</p>
      {has(c.by) && <footer className={`${micro} mt-6 text-white/60`}>— {c.by}</footer>}
    </blockquote>
  )
}

function Stat({ c }) {
  return (
    <div className="flex h-full flex-col justify-between border-t border-ink pt-5">
      <p className={`${micro} text-soot/80`}>{c.label}</p>
      <p className="mt-6 font-display text-[clamp(48px,5vw,112px)] font-extralight leading-[.9] tracking-[-.05em] text-ink">{c.value}</p>
      {has(c.note) && <p className="mt-4 text-[13px] leading-[1.6] text-soot/90">{c.note}</p>}
    </div>
  )
}

function Steps({ c }) {
  const items = (c.items || []).filter(([t, d]) => has(t) || has(d))
  return (
    <div className="md:pt-8">
      {has(c.title) && <h3 className="mb-6 text-[clamp(28px,2.4vw,48px)]">{c.title}</h3>}
      <ol className="border-t border-ink/30">
        {items.map(([t, d], i) => (
          <li key={i} className="grid gap-x-8 gap-y-2 border-b border-ink/15 py-6 md:grid-cols-[64px_minmax(0,1fr)_minmax(0,1.4fr)]">
            <span className="font-display text-[clamp(22px,1.6vw,32px)] font-extralight tabular-nums text-soot/70">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-display text-[clamp(20px,1.5vw,30px)] font-light tracking-[-.03em] text-ink">{t}</span>
            <span className="text-[15px] leading-[1.8] text-soot/90">{d}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function CopyButton({ text, label = 'Copy prompt' }) {
  const [state, setState] = useState('')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState('Copied')
    } catch {
      // Older browsers / blocked clipboard: select the text so Ctrl+C works.
      setState('Press Ctrl+C to copy')
    }
    setTimeout(() => setState(''), 2200)
  }
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-3 border border-ink px-4 py-2.5 text-[11px] uppercase tracking-label transition hover:bg-ink hover:text-white">
      <span aria-live="polite">{state || label}</span>
      <span aria-hidden="true">⧉</span>
    </button>
  )
}

function Prompt({ c }) {
  return (
    <div className="flex h-full flex-col border border-ink/25 bg-white p-[clamp(20px,1.6vw,36px)]">
      <p className={`${micro} text-soot/80`}>{c.label || 'Try this prompt'}</p>
      {has(c.title) && <h3 className="mt-4 text-[clamp(22px,1.7vw,34px)]">{c.title}</h3>}
      <pre className="mt-5 flex-1 whitespace-pre-wrap break-words bg-paper p-4 font-sans text-[14px] leading-[1.75] text-ink">{c.prompt}</pre>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <CopyButton text={c.prompt} />
        {has(c.note) && <p className="max-w-[60%] text-[12px] leading-[1.6] text-soot/80">{c.note}</p>}
      </div>
    </div>
  )
}

// One AI Weekly Tip, as sent by email: the idea, its key points, "instead of / try this",
// a prompt to copy and the week's challenge (task). Every part is optional.
function Tip({ c }) {
  const items = (c.items || []).filter(([t, d]) => has(t) || has(d))
  const compare = has(c.instead) && has(c.better)
  return (
    <article className="grid h-full gap-x-[clamp(24px,3vw,72px)] gap-y-10 border-t border-ink pt-[clamp(20px,1.6vw,36px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div>
        <p className={`${micro} text-soot/80`}>AI Weekly Tip{has(c.week) && <> · <span className="text-ink">{c.week}</span></>}</p>
        <h3 className="mt-4 text-[clamp(28px,2.4vw,52px)] !leading-[1.05]">{c.title}</h3>
        {has(c.idea) && <p className="mt-5 text-[15px] leading-[1.85] text-soot/90"><Lines>{c.idea}</Lines></p>}
        {items.length > 0 && (
          <ol className="mt-8 grid gap-x-6 sm:grid-cols-2">
            {items.map(([t, d], i) => (
              <li key={i} className="border-t border-ink/15 py-4">
                <span className="text-[11px] tabular-nums text-soot/70">{String(i + 1).padStart(2, '0')}</span>
                <p className="mt-1 font-display text-[18px] font-normal tracking-[-.02em] text-ink">{t}</p>
                {has(d) && <p className="mt-1 text-[13px] leading-[1.65] text-soot/90">{d}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="flex flex-col gap-5">
        {compare && (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <div className="border border-ink/15 p-4">
              <p className={`${micro} text-soot/70`}>Instead of asking</p>
              <p className="mt-3 text-[14px] leading-[1.7] text-soot/70">“{c.instead}”</p>
            </div>
            <div className="border border-ink bg-white p-4">
              <p className={`${micro} text-ink`}>Try this</p>
              <p className="mt-3 text-[14px] leading-[1.7] text-ink">“{c.better}”</p>
              <div className="mt-4"><CopyButton text={c.better} /></div>
            </div>
          </div>
        )}
        {has(c.prompt) && (
          <div className="border border-ink/25 bg-white p-[clamp(16px,1.2vw,28px)]">
            <p className={`${micro} text-soot/80`}>Try this prompt</p>
            <pre className="mt-4 whitespace-pre-wrap break-words bg-paper p-4 font-sans text-[14px] leading-[1.75] text-ink">{c.prompt}</pre>
            <div className="mt-4"><CopyButton text={c.prompt} /></div>
          </div>
        )}
        {has(c.task) && (
          <div className="bg-ink p-[clamp(16px,1.2vw,28px)] text-white">
            <p className={`${micro} text-white/60`}>Your AI challenge</p>
            <p className="mt-3 text-[14px] leading-[1.75]">{c.task}</p>
          </div>
        )}
        {has(c.takeaway) && (
          <p className="border-l-2 border-[#334dd2] pl-4 font-display text-[clamp(18px,1.2vw,24px)] font-light leading-[1.35] tracking-[-.02em] text-ink">{c.takeaway}</p>
        )}
      </div>
    </article>
  )
}

const external = (url) => /^https?:\/\//i.test(url || '')

function LinkCard({ c }) {
  const ext = external(c.url)
  return (
    <a href={c.url || '#'} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group flex h-full flex-col justify-between border border-ink/25 p-[clamp(20px,1.6vw,36px)] transition hover:bg-ink hover:text-white">
      <div>
        {has(c.tag) && <p className={`${micro} text-soot/80 transition group-hover:text-white/60`}>{c.tag}</p>}
        <h3 className="mt-4 text-[clamp(22px,1.7vw,34px)]">{c.title}</h3>
        {has(c.desc) && <p className="mt-3 text-[14px] leading-[1.7] text-soot/90 transition group-hover:text-white/75">{c.desc}</p>}
      </div>
      <span className="link-line mt-8 w-full">{c.cta || 'Open'} {ext ? <ArrowUpRight aria-hidden="true" className="inline-block h-[1em] w-[1em] align-[-0.125em]" strokeWidth={1.75} /> : <ArrowRight aria-hidden="true" className="inline-block h-[1em] w-[1em] align-[-0.125em]" strokeWidth={1.75} />}</span>
    </a>
  )
}

// YouTube / Vimeo links become embeds; .mp4/.webm play natively; anything else (e.g. a Stream
// or SharePoint embed URL) is framed as given.
function embedOf(url) {
  const u = String(url || '')
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  if (yt) return { kind: 'frame', src: `https://www.youtube-nocookie.com/embed/${yt[1]}` }
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return { kind: 'frame', src: `https://player.vimeo.com/video/${vm[1]}` }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return { kind: 'file', src: u }
  return u ? { kind: 'frame', src: u } : null
}

function Video({ c }) {
  const e = embedOf(c.url)
  if (!e) return null
  return (
    <figure className="flex h-full flex-col">
      <div className="relative aspect-video w-full overflow-hidden bg-ink">
        {e.kind === 'file' ? <video src={e.src} poster={c.poster || undefined} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
            : <iframe src={e.src} title={c.caption || 'Video'} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 h-full w-full border-0" />}
      </div>
      {has(c.caption) && <figcaption className={`${micro} mt-3 text-soot/80`}>{c.caption}</figcaption>}
    </figure>
  )
}

function Quiz({ c }) {
  const [pick, setPick] = useState(null)
  const options = (c.options || []).filter(has)
  const answered = pick != null
  return (
    <div className="flex h-full flex-col border border-ink/25 bg-white p-[clamp(20px,1.6vw,36px)]">
      <p className={`${micro} text-soot/80`}>Quick quiz</p>
      <h3 className="mt-4 text-[clamp(20px,1.5vw,30px)] !leading-[1.2]">{c.question}</h3>
      <div className="mt-6 grid gap-2" role="group" aria-label={c.question}>
        {options.map((o, i) => {
          const right = i === Number(c.answer)
          const state = !answered ? 'border-ink/25 hover:border-ink' : right ? 'border-ink bg-ink text-white' : i === pick ? 'border-red-700 text-red-700 line-through' : 'border-ink/15 text-soot/50'
          return (
            <button key={i} type="button" disabled={answered} onClick={() => setPick(i)} className={`flex items-center justify-between border px-4 py-3 text-left text-[14px] transition ${state}`}>
              <span>{o}</span>
              {answered && right && <Check aria-label="correct answer" className="inline-block h-[1em] w-[1em] align-[-0.125em]" strokeWidth={1.75} />}
            </button>
          )
        })}
      </div>
      <p aria-live="polite" className="mt-5 text-[14px] leading-[1.7] text-soot/90">
        {answered && <><strong className="font-semibold text-ink">{pick === Number(c.answer) ? 'Correct. ' : 'Not quite. '}</strong>{c.explain}</>}
      </p>
    </div>
  )
}

function Note({ c }) {
  const tone = c.tone === 'warn' ? 'border-amber-600 bg-amber-50' : 'border-[#334dd2] bg-[#334dd2]/[.06]'
  return (
    <aside className={`h-full border-l-4 p-[clamp(18px,1.4vw,30px)] ${tone}`}>
      {has(c.title) && <p className={`${micro} font-semibold text-ink`}>{c.title}</p>}
      <p className="mt-3 text-[14px] leading-[1.8] text-soot"><Lines>{c.text}</Lines></p>
    </aside>
  )
}

export function Block({ b }) {
  const c = b.content || {}
  switch (b.type) {
    case 'image':
      return (
        <figure className="relative h-full min-h-[220px] overflow-hidden bg-stone">
          <Photo src={c.url} alt={c.alt} className="absolute inset-0" />
          {c.caption && <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-[11px] uppercase tracking-[.12em] text-white">{c.caption}</figcaption>}
        </figure>
      )
    case 'heading': return <h3 className="flex h-full items-end text-[clamp(32px,3.6vw,56px)]"><Lines>{c.text}</Lines></h3>
    case 'quote': return <Quote c={c} />
    case 'stat': return <Stat c={c} />
    case 'steps': return <Steps c={c} />
    case 'prompt': return <Prompt c={c} />
    case 'tip': return <Tip c={c} />
    case 'link': return <LinkCard c={c} />
    case 'video': return <Video c={c} />
    case 'quiz': return <Quiz c={c} />
    case 'note': return <Note c={c} />
    case 'challenge':
      return (
        <Suspense fallback={<div className="min-h-[480px] bg-ink" />}>
          <Sudoku edition={c.edition} title={c.title} intro={c.intro} prize={c.prize} />
        </Suspense>
      )
    default: return <p className="text-[15px] leading-[1.9] text-soot/90"><Lines>{c.text}</Lines></p>
  }
}

// Renders the 12-column content grid for a section (also used by the admin preview).
// Rows are at least 96px on desktop and grow to fit their content, so text never gets clipped.
export function BlockGrid({ blocks }) {
  if (!blocks?.length) return null
  return (
    <div className="grid grid-cols-1 gap-y-12 md:auto-rows-[minmax(96px,auto)] md:grid-cols-12 md:gap-x-6 md:gap-y-[clamp(56px,4.5vw,112px)]">
      {blocks.map((b, i) => (
        <div
          key={b.id || i}
          data-cms={`b.${b.id}`}
          style={{ '--cs': b.col_span || 12, '--rs': b.row_span || 1 }}
          className="min-w-0 md:[grid-column:span_var(--cs)] md:[grid-row:span_var(--rs)]"
        >
          <Block b={b} />
        </div>
      ))}
    </div>
  )
}
