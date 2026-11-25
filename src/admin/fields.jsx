import { useRef, useState } from 'react'
import { uploadImage } from '../lib/supabase.js'

export const inputCls = 'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none focus:border-neutral-900'
export const btnCls = 'rounded-md border border-neutral-900 bg-neutral-900 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40'
export const ghostCls = 'rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-[12px] text-neutral-800 transition hover:border-neutral-900 disabled:opacity-40'

export const Label = ({ children }) => (
  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">{children}</span>
)

export function Field({ label, value, onChange, multiline, rows = 3 }) {
  const long = multiline ?? (String(value ?? '').length > 70 || String(value ?? '').includes('\n'))
  return (
    <label className="block">
      <Label>{label}</Label>
      {long
        ? <textarea rows={rows} className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        : <input className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
    </label>
  )
}

export function ImageField({ label, value, onChange, alt, onAlt }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setErr('')
    try { onChange(await uploadImage(file)) } catch (x) { setErr(x.message) }
    setBusy(false); e.target.value = ''
  }
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded border border-neutral-300 bg-neutral-100">
          {value && <img src={value} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex-1 space-y-2">
          <input className={inputCls} placeholder="Image URL" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className={ghostCls} disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Uploading…' : 'Upload image'}</button>
            {value && <button type="button" className={ghostCls} onClick={() => onChange('')}>Remove</button>}
          </div>
          {err && <p className="text-[11px] text-red-600">{err}</p>}
          {onAlt && (
            <input className={inputCls} placeholder="Describe the image for screen readers (leave empty if decorative)" value={alt ?? ''} onChange={(e) => onAlt(e.target.value)} />
          )}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  )
}

const isImageKey = (k, parent) => parent === 'images' || /url$/i.test(k)

// Plain-language names for the content keys editors see.
const LABELS = {
  cta: 'Button text', link: 'Secondary link text', slug: 'Links to section', desc: 'Short description', descr: 'Short description',
  tag: 'Small tag', meta: 'Right-hand note', eyebrow: 'Small line above title', sub: 'Subheading', label: 'Section label',
  quote: 'Quote', note: 'Supporting note', title: 'Title', question: 'Question', options: 'Answer', submit: 'Submit button text',
  thanks: 'Thank-you heading', thanksNote: 'Thank-you note', promptLabel: 'Prompt button text', prompt: 'Prompt text',
  week: 'Week (e.g. Week 6)', idea: 'The idea', instead: 'Instead of asking', better: 'Try this instead',
  task: 'Your AI challenge', takeaway: 'Takeaway',
  number: 'Big number', topLeft: 'Top-left note', topRight: 'Top-right note', cardLabel: 'Label on each past edition card',
  imageUrl: 'Image', imageAlt: 'Image description (alt text)', feature: 'Featured story', cards: 'Story card', hero: 'Hero image', transform: 'Featured story image',
  walkway: 'Story card 1 image', people: 'Story card 2 image', blocks: 'Story card 3 image', ai: 'AI Enablement image', challenge: 'Take a break image',
}
export const pretty = (k) => {
  const base = String(k).replace(/ \d+$/, '')
  const n = String(k).slice(base.length)
  const nice = LABELS[base] || base.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  return nice + n
}

// Picks which section page a link goes to, instead of typing its slug.
export function SectionPicker({ label = 'Links to section', value, onChange, sections }) {
  const known = sections.some((s) => s.slug === value)
  return (
    <label className="block">
      <Label>{label}</Label>
      <select className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {!known && <option value={value ?? ''}>{value ? `Missing section (${value})` : 'Choose a section…'}</option>}
        {sections.map((s) => <option key={s.id} value={s.slug}>{s.n} · {s.title}</option>)}
      </select>
      {!known && value && <span className="mt-1 block text-[11px] text-amber-700">This link points to a section that no longer exists.</span>}
    </label>
  )
}

// Renders an editable form for any JSON value: objects, arrays, strings, numbers.
export function JsonForm({ value, onChange, name = '', parent = '', sections }) {
  if (Array.isArray(value)) {
    const set = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)))
    const blank = typeof value[0] === 'object' && value[0] !== null
      ? JSON.parse(JSON.stringify(value[0]), (k, v) => (typeof v === 'string' ? '' : v))
      : ''
    return (
      <div className="space-y-3">
        {value.map((item, i) => (
          <div key={i} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <JsonForm value={item} onChange={(v) => set(i, v)} name={`${name} ${i + 1}`} parent={name} sections={sections} />
            <button type="button" className="mt-2 text-[11px] text-red-600" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" className={ghostCls} onClick={() => onChange([...value, blank])}>+ Add {pretty(name) || 'item'}</button>
      </div>
    )
  }
  if (value && typeof value === 'object') {
    return (
      <div className="space-y-4">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            {typeof v === 'object' && v !== null && !Array.isArray(v) && <h4 className="mb-2 mt-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-800">{pretty(k)}</h4>}
            <JsonForm value={v} name={k} parent={name} sections={sections} onChange={(nv) => onChange({ ...value, [k]: nv })} />
          </div>
        ))}
      </div>
    )
  }
  if (typeof value === 'number') return <Field label={pretty(name)} value={value} onChange={(v) => onChange(Number(v) || 0)} multiline={false} />
  if (name === 'slug' && sections) return <SectionPicker value={value} onChange={onChange} sections={sections} />
  if (isImageKey(name, parent)) return <ImageField label={pretty(name)} value={value} onChange={onChange} />
  return <Field label={pretty(name)} value={value} onChange={onChange} />
}
