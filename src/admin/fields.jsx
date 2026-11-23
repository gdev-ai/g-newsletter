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

export function ImageField({ label, value, onChange }) {
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
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  )
}

const isImageKey = (k, parent) => parent === 'images' || /url$/i.test(k)
const pretty = (k) => k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')

// Renders an editable form for any JSON value: objects, arrays, strings, numbers.
export function JsonForm({ value, onChange, name = '', parent = '' }) {
  if (Array.isArray(value)) {
    const set = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)))
    const blank = typeof value[0] === 'object' && value[0] !== null
      ? JSON.parse(JSON.stringify(value[0]), (k, v) => (typeof v === 'string' ? '' : v))
      : ''
    return (
      <div className="space-y-3">
        {value.map((item, i) => (
          <div key={i} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <JsonForm value={item} onChange={(v) => set(i, v)} name={`${pretty(name)} ${i + 1}`} parent={name} />
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
            <JsonForm value={v} name={k} parent={name} onChange={(nv) => onChange({ ...value, [k]: nv })} />
          </div>
        ))}
      </div>
    )
  }
  if (typeof value === 'number') return <Field label={pretty(name)} value={value} onChange={(v) => onChange(Number(v) || 0)} multiline={false} />
  if (isImageKey(name, parent)) return <ImageField label={pretty(name)} value={value} onChange={onChange} />
  return <Field label={pretty(name)} value={value} onChange={onChange} />
}
