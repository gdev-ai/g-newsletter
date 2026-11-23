import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase.js'
import { PLACEHOLDERS, isLive, isScheduled, withContentDefaults } from '../lib/edition.js'
import { getIn, setIn } from '../lib/cms.js'
import { DEFAULT_DESIGN, FONT_CHOICES } from '../lib/theme.js'
import { DEFAULT_BRAND, listQuarters, useSite } from '../lib/site.jsx'
import { btnCls, Field, ghostCls, ImageField, JsonForm, Label, pretty, SectionPicker } from './fields.jsx'
import GridEditor from './GridEditor.jsx'

const GROUPS = [
  ['hero', 'Hero'], ['intro', 'Editor’s note'], ['stories', 'Quarterly highlights'], ['directory', 'Section directory'],
  ['ai', 'AI Corner'], ['poll', 'Poll'], ['challenge', 'Take a break'], ['archive', 'Archive'], ['images', 'All images'],
]
const COLORS = [['home', 'Home page background'], ['paper', 'Reading page background'], ['stone', 'Panel background'], ['ink', 'Text & dark sections'], ['soot', 'Secondary text']]
const DEVICES = { desktop: '100%', tablet: '768px', mobile: '390px' }
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const human = (k) => k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const isImagePath = (p) => /(^|\.)images\./.test(p) || /photo_url$|logoUrl$|imageUrl$/.test(p)
const clone = (x) => JSON.parse(JSON.stringify(x))
// <input type="datetime-local"> works in local time without a zone; the database stores UTC.
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null)
const when = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function StatusBadge({ q }) {
  if (q.is_published) return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">Live</span>
  if (isLive(q)) return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800" title={`Went live ${when(q.publish_at)}`}>Live (scheduled)</span>
  if (isScheduled(q)) return <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-medium text-sky-800" title={when(q.publish_at)}>Scheduled · {when(q.publish_at)}</span>
  return <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-700">Draft</span>
}

const IMAGE_KEYS = ['hero', 'transform', 'ai', 'challenge']
// Story card photos now live on each card (Quarterly highlights → Story card → Image).
const CARD_IMAGE_KEYS = ['walkway', 'people', 'blocks']

function Row({ title, hint, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between border-b border-neutral-200 bg-white px-4 py-3.5 text-left text-[13px] hover:bg-neutral-50">
      <span><span className="block text-neutral-900">{title}</span>{hint && <span className="block text-[11px] text-neutral-500">{hint}</span>}</span>
      <span className="text-neutral-400">›</span>
    </button>
  )
}

export default function Editor({ email, onSignOut }) {
  const [params] = useSearchParams()
  const site = useSite()
  const [quarters, setQuarters] = useState([])
  const [qid, setQid] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loadedSlug, setLoadedSlug] = useState('')
  const [page, setPage] = useState('home')
  const [stack, setStack] = useState([{ name: 'root' }])
  const [selPath, setSelPath] = useState(null)
  const [selBlock, setSelBlock] = useState(null)
  const [device, setDevice] = useState('desktop')
  const [status, setStatus] = useState('')
  const [toast, setToast] = useState(null) // { text, tone }
  const toastTimer = useRef(0)
  const notify = useCallback((text, tone = 'ok', ms = 3500) => {
    clearTimeout(toastTimer.current)
    setToast({ text, tone })
    if (ms) toastTimer.current = setTimeout(() => setToast(null), ms)
  }, [])
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const iframe = useRef(null)
  const snap = useRef(null)
  const draftRef = useRef(null)
  const selRef = useRef(null)
  draftRef.current = draft
  selRef.current = selPath

  const dirty = draft && snap.current && JSON.stringify(draft) !== JSON.stringify(snap.current)
  const dirtyRef = useRef(false)
  dirtyRef.current = !!dirty

  // ---- undo history ----
  // Each burst of edits (changes less than 700ms apart, e.g. typing a word) becomes one undo step.
  const hist = useRef({ past: [], future: [], last: null, at: 0, skip: false })
  const [, rerender] = useState(0)
  useEffect(() => {
    const h = hist.current
    if (!draft) return
    if (h.skip || !h.last) { h.skip = false; h.last = draft; return }
    if (h.last === draft) return
    const now = Date.now()
    if (now - h.at > 700) { h.past.push(h.last); if (h.past.length > 100) h.past.shift() }
    h.at = now
    h.future = []
    h.last = draft
    rerender((n) => n + 1)
  }, [draft])
  const undo = useCallback(() => {
    const h = hist.current
    if (!h.past.length) return
    h.future.push(draftRef.current); h.skip = true; h.at = 0
    setDraft(h.past.pop()); rerender((n) => n + 1)
  }, [])
  const redo = useCallback(() => {
    const h = hist.current
    if (!h.future.length) return
    h.past.push(draftRef.current); h.skip = true; h.at = 0
    setDraft(h.future.pop()); rerender((n) => n + 1)
  }, [])

  // Loads an edition into the editor; returns an error message instead of throwing.
  const loadDraft = useCallback(async (id) => {
    try {
      const [q, s, st] = await Promise.all([
        supabase.from('quarters').select('*').eq('id', id).single(),
        supabase.from('sections').select('*').eq('quarter_id', id).order('position'),
        supabase.from('site_settings').select('key,value'),
      ])
      if (q.error || s.error || st.error) throw q.error || s.error || st.error
      const ids = s.data.map((x) => x.id)
      const b = ids.length ? await supabase.from('section_blocks').select('*').in('section_id', ids).order('position') : { data: [] }
      if (b.error) throw b.error
      const byS = Object.fromEntries(ids.map((i) => [i, []]))
      b.data.forEach((x) => byS[x.section_id].push(x))
      const val = (k, d) => ({ ...d, ...(st.data.find((x) => x.key === k)?.value || {}) })
      const d = { quarter: { ...q.data, content: withContentDefaults(q.data.content) }, sections: s.data, blocks: byS, design: val('design', DEFAULT_DESIGN), brand: val('brand', DEFAULT_BRAND) }
      snap.current = clone(d)
      hist.current = { past: [], future: [], last: null, at: 0, skip: false }
      setLoadedSlug(q.data.slug)
      setDraft(d)
      setLoadError('')
      return ''
    } catch (e) {
      const msg = errorText(e)
      if (!draftRef.current) setLoadError(msg)
      return msg
    }
  }, [])

  useEffect(() => {
    listQuarters('id,slug,label,title,is_published,sort').then(({ data, error }) => {
      if (error) return setLoadError(errorText(error))
      setQuarters(data)
      const first = params.get('q') || data[0]?.id
      if (first) setQid(first)
      else setLoadError('There are no editions yet. Create one on the Quarters page.')
    })
  }, [attempt])
  useEffect(() => { if (qid) { setPage('home'); setStack([{ name: 'root' }]); setSelPath(null); loadDraft(qid) } }, [qid, loadDraft])

  // ---- preview bridge (same-origin only) ----
  const send = useCallback(() => {
    const w = iframe.current?.contentWindow
    if (!w || !draftRef.current) return
    w.postMessage({ type: 'cms:state', state: draftRef.current }, window.location.origin)
    w.postMessage({ type: 'cms:selected', path: selRef.current }, window.location.origin)
  }, [])
  useEffect(() => { send() }, [draft, selPath, send])

  useEffect(() => {
    const on = (e) => {
      if (e.origin !== window.location.origin || e.source !== iframe.current?.contentWindow) return
      if (e.data?.type === 'cms:ready') send()
      if (e.data?.type === 'cms:select') select(e.data.path)
      if (e.data?.type === 'cms:key') shortcutRef.current?.(e.data.key, e.data.shift)
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  })

  const select = (path) => {
    setSelPath(path)
    if (path.startsWith('b.')) {
      const bid = path.slice(2)
      const sid = Object.keys(draftRef.current.blocks).find((s) => draftRef.current.blocks[s].some((b) => b.id === bid))
      setSelBlock(bid)
      setStack([{ name: 'root' }, { name: 'sections' }, { name: 'section', sid }])
    } else setStack([{ name: 'root' }, { name: 'edit', path }])
  }

  const setPath = (path, v) => setDraft((d) => {
    const [root, ...keys] = path.split('.')
    if (root === 'c') return { ...d, quarter: { ...d.quarter, content: setIn(d.quarter.content, keys, v) } }
    if (root === 's') { const [sid, ...k] = keys; return { ...d, sections: d.sections.map((s) => (s.id === sid ? setIn(s, k, v) : s)) } }
    if (root === 'brand') return { ...d, brand: setIn(d.brand, keys, v) }
    if (root === 'design') return { ...d, design: setIn(d.design, keys, v) }
    if (root === 'q') return { ...d, quarter: setIn(d.quarter, keys, v) }
    return d
  })
  const getPath = (path) => {
    const [root, ...keys] = path.split('.')
    if (root === 'c') return getIn(draft.quarter.content, keys)
    if (root === 's') { const [sid, ...k] = keys; return getIn(draft.sections.find((s) => s.id === sid), k) }
    if (root === 'brand') return getIn(draft.brand, keys)
    return undefined
  }

  const push = (p) => setStack((s) => [...s, p])
  const back = () => { setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)); setSelPath(null) }

  // ---- save ----
  // The edition (quarter, sections and grids) is written by one database function, so a save
  // either fully succeeds or changes nothing. Global design/brand settings are separate upserts.
  const save = async (d = draftRef.current, okText = 'Saved') => {
    if (status === 'Saving…') return
    setStatus('Saving…')
    const s0 = snap.current
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    const errs = []
    const editionChanged = !same(d.quarter, s0.quarter) || !same(d.sections, s0.sections) || !same(d.blocks, s0.blocks)
    if (editionChanged) {
      const q = { ...d.quarter, issue_no: Math.max(1, parseInt(d.quarter.issue_no, 10) || 1) }
      const sections = d.sections.map((s, i) => ({
        ...s, position: i + 1, read_min: Math.max(1, parseInt(s.read_min, 10) || 1),
        blocks: (d.blocks[s.id] || []).map(({ id, type, col_span, row_span, content }) => ({ id, type, col_span, row_span, content })),
      }))
      const { error } = await supabase.rpc('save_edition', { p_quarter: q, p_sections: sections })
      if (error) errs.push(errorText(error))
    }
    if (!errs.length)
      for (const k of ['design', 'brand'])
        if (!same(d[k], s0[k])) {
          const r = await supabase.from('site_settings').upsert({ key: k, value: d[k], updated_at: new Date().toISOString() })
          if (r.error) errs.push(errorText(r.error))
        }
    if (errs.length) { setStatus(''); notify(`Not saved: ${errs[0]}`, 'error', 0); return false }
    // New sections got real ids on save; keep the editor on the same page.
    const onNewSection = page !== 'home' && !s0.sections.some((s) => s.id === page)
    const reloadError = await loadDraft(qid)
    if (onNewSection) { setPage('home'); setStack([{ name: 'root' }, { name: 'sections' }]) }
    site.reload()
    setStatus('')
    setQuarters((list) => list.map((x) => (x.id === d.quarter.id ? { ...x, ...d.quarter } : x)))
    if (reloadError) notify(`Saved, but reloading failed: ${reloadError}`, 'error', 0)
    else notify(`${okText} ✓`)
    return true
  }
  const saveRef = useRef(save)
  saveRef.current = save

  // Publishing is explicit and saves immediately (along with any other pending edits).
  const live = isLive(draft?.quarter)
  const setLive = () => {
    const q = draft.quarter
    const goingLive = !live
    const msg = goingLive
      ? `Publish ${q.label} now? Readers will see it immediately${dirty ? ', including your unsaved changes' : ''}.`
      : `Unpublish ${q.label}? Readers will no longer see it${q.publish_at ? ', and its schedule is cleared' : ''}.`
    if (!confirm(msg)) return
    const d = { ...draft, quarter: { ...q, is_published: goingLive, publish_at: goingLive ? q.publish_at : null } }
    setDraft(d)
    save(d, goingLive ? 'Published' : 'Unpublished')
  }

  // ---- guard against losing work ----
  useEffect(() => {
    const on = (e) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', on)
    return () => window.removeEventListener('beforeunload', on)
  }, [])
  const leaveOk = () => !dirtyRef.current || confirm('You have unsaved changes. Leave without saving?')

  // ---- keyboard: Ctrl/Cmd+S saves, Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl+Y redoes ----
  const shortcut = useCallback((k, shift) => {
    if (k === 's') { if (dirtyRef.current) saveRef.current(); return true }
    if (k === 'z' && !shift) { undo(); return true }
    if ((k === 'z' && shift) || k === 'y') { redo(); return true }
    return false
  }, [undo, redo])
  const shortcutRef = useRef(shortcut)
  shortcutRef.current = shortcut
  useEffect(() => {
    const on = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (shortcutRef.current(e.key.toLowerCase(), e.shiftKey)) e.preventDefault()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const discard = () => {
    if (!confirm('Discard all unsaved changes?')) return
    setDraft(clone(snap.current)); setSelPath(null); setSelBlock(null)
    if (page !== 'home' && !snap.current.sections.some((s) => s.id === page)) { setPage('home'); setStack([{ name: 'root' }]) }
  }

  // Adding and removing sections only changes the draft; nothing is written until Save.
  const addSection = () => {
    const id = `new-${Date.now().toString(36)}`
    const s = {
      id, quarter_id: qid, slug: `section-${Date.now().toString(36)}`, n: String(draft.sections.length + 1).padStart(2, '0'),
      position: draft.sections.length + 1, title: 'New section', short: 'New section', descr: 'Short description.',
      headline: 'Headline goes here.', quote: 'A short pull quote.', photo_url: '', read_min: 1,
      points: [['Point one', ''], ['Point two', ''], ['Point three', '']], body: ['Write the opening paragraph.'],
    }
    setDraft((d) => ({ ...d, sections: [...d.sections, s], blocks: { ...d.blocks, [id]: [] } }))
    setPage(id); push({ name: 'section', sid: id })
  }
  const removeSection = (sid) => {
    setDraft((d) => {
      const { [sid]: _, ...blocks } = d.blocks
      return { ...d, sections: d.sections.filter((s) => s.id !== sid), blocks }
    })
    setPage('home'); setStack([{ name: 'root' }, { name: 'sections' }])
    notify('Section removed — Save to apply, or Undo (Ctrl+Z) to bring it back', 'info', 5000)
  }
  const moveSection = (i, dir) => setDraft((d) => {
    const j = i + dir
    if (j < 0 || j >= d.sections.length) return d
    const a = d.sections[i], b = d.sections[j]
    const next = [...d.sections]
    next[i] = { ...b, position: a.position, n: a.n }; next[j] = { ...a, position: b.position, n: b.n }
    return { ...d, sections: next }
  })

  // ---- preview url ----
  const src = useMemo(() => {
    if (!loadedSlug) return ''
    const base = `/q/${loadedSlug}`
    if (page === 'home') return `${base}?cms=1`
    const s = snap.current?.sections.find((x) => x.id === page)
    return `${base}/section/${s?.slug || 'x'}?cms=1&sid=${page}`
  }, [loadedSlug, page])

  if (!draft && loadError)
    return (
      <div className="grid h-screen place-items-center bg-neutral-100 p-6 text-center font-sans">
        <div className="space-y-4">
          <p className="text-[14px] text-neutral-800">The editor could not load.</p>
          <p className="text-[12px] text-neutral-500">{loadError}</p>
          <div className="flex justify-center gap-2">
            <button className={btnCls} onClick={() => { setLoadError(''); qid ? loadDraft(qid) : setAttempt((n) => n + 1) }}>Try again</button>
            <Link to="/admin/quarters" className={ghostCls}>Quarters</Link>
          </div>
        </div>
      </div>
    )
  if (!draft) return <div className="grid h-screen place-items-center bg-neutral-100 text-[13px] text-neutral-500">Loading editor…</div>
  const sections = draft.sections

  // ---- panels ----
  const cur = stack[stack.length - 1]
  const titles = { root: 'Customize', sections: 'Sections', home: 'Home page', group: 'Edit', edit: 'Edit', section: 'Section', design: 'Design & colors', brand: 'Brand & footer', details: 'Edition details' }

  const renderPanel = () => {
    if (cur.name === 'root')
      return (
        <div>
          <Row title="Home page" hint="Hero, stories, poll, images…" onClick={() => { setPage('home'); push({ name: 'home' }) }} />
          <Row title="Sections" hint={`${sections.length} section pages`} onClick={() => push({ name: 'sections' })} />
          <Row title="Design & colors" hint="Colors and fonts" onClick={() => push({ name: 'design' })} />
          <Row title="Brand & footer" hint="Wordmark, logo, footer text" onClick={() => push({ name: 'brand' })} />
          <Row title="Edition details" hint="Label, title, issue number, link" onClick={() => push({ name: 'details' })} />
          <p className="px-4 pt-4 text-[11px] text-neutral-500">Tip: click any text or image in the preview to edit it here.</p>
          <p className="px-4 py-2 text-[11px] text-neutral-500">
            Write {PLACEHOLDERS.map((p, i) => <span key={p}>{i ? ', ' : ''}<code className="rounded bg-neutral-200 px-1">{p}</code></span>)} in any text to show this edition’s issue number, label or title — they stay correct when an edition is copied.
          </p>
        </div>
      )

    if (cur.name === 'home')
      return <div>{GROUPS.map(([k, l]) => <Row key={k} title={l} onClick={() => push({ name: 'group', key: k })} />)}</div>

    if (cur.name === 'group' && cur.key === 'images') {
      const c = draft.quarter.content
      return (
        <div className="space-y-6 p-4">
          <p className="text-[12px] text-neutral-500">Story card photos are set on each card under Home page → Quarterly highlights.</p>
          {Object.keys({ ...Object.fromEntries(IMAGE_KEYS.map((k) => [k, ''])), ...c.images }).filter((k) => !CARD_IMAGE_KEYS.includes(k)).map((k) => (
            <ImageField
              key={k} label={pretty(k)} value={c.images?.[k]} onChange={(v) => setPath(`c.images.${k}`, v)}
              alt={c.imageAlts?.[k]} onAlt={(v) => setPath(`c.imageAlts.${k}`, v)}
            />
          ))}
        </div>
      )
    }

    if (cur.name === 'group')
      return <div className="p-4"><JsonForm value={draft.quarter.content[cur.key]} name={cur.key} sections={sections} onChange={(v) => setPath(`c.${cur.key}`, v)} /></div>

    if (cur.name === 'edit') {
      const path = cur.path
      const val = getPath(path)
      const keys = path.split('.')
      const label = pretty(keys[keys.length - 1] === '0' || /^\d+$/.test(keys[keys.length - 1]) ? keys[keys.length - 2] : keys[keys.length - 1])
      return (
        <div className="space-y-5 p-4">
          {/^c\.images\./.test(path)
            ? <ImageField label={pretty(keys[keys.length - 1])} value={val} onChange={(v) => setPath(path, v)} alt={draft.quarter.content.imageAlts?.[keys[2]]} onAlt={(v) => setPath(`c.imageAlts.${keys[2]}`, v)} />
            : isImagePath(path)
            ? <ImageField label={label} value={val} onChange={(v) => setPath(path, v)} />
            : /\.slug$/.test(path) && path.startsWith('c.')
            ? <SectionPicker value={val} onChange={(v) => setPath(path, v)} sections={sections} />
            : <Field label={label} value={val} onChange={(v) => setPath(path, v)} multiline rows={Math.min(10, Math.max(3, Math.ceil(String(val ?? '').length / 40)))} />}
          {path.startsWith('c.') && <button className={ghostCls} onClick={() => push({ name: 'group', key: path.split('.')[1] })}>All {human(path.split('.')[1])} fields</button>}
          {path.startsWith('s.') && <button className={ghostCls} onClick={() => { setPage(path.split('.')[1]); push({ name: 'section', sid: path.split('.')[1] }) }}>Open full section editor</button>}
          {path.startsWith('brand.') && <button className={ghostCls} onClick={() => push({ name: 'brand' })}>All brand fields</button>}
        </div>
      )
    }

    if (cur.name === 'sections')
      return (
        <div>
          {sections.map((s, i) => (
            <div key={s.id} className="flex items-center border-b border-neutral-200 bg-white">
              <button className="flex-1 px-4 py-3 text-left text-[13px] hover:bg-neutral-50" onClick={() => { setPage(s.id); push({ name: 'section', sid: s.id }) }}>
                <span className="mr-2 text-neutral-400">{s.n}</span>{s.title}
              </button>
              <button className="px-2 text-neutral-500 disabled:opacity-30" disabled={i === 0} onClick={() => moveSection(i, -1)}>↑</button>
              <button className="px-2 text-neutral-500 disabled:opacity-30" disabled={i === sections.length - 1} onClick={() => moveSection(i, 1)}>↓</button>
            </div>
          ))}
          <div className="p-4"><button className={ghostCls} onClick={addSection}>+ Add section</button></div>
        </div>
      )

    if (cur.name === 'section') {
      const s = sections.find((x) => x.id === cur.sid)
      if (!s) return null
      const f = (k) => ({ value: s[k], onChange: (v) => setPath(`s.${s.id}.${k}`, v) })
      return (
        <div className="space-y-5 p-4">
          <Field label="Title (in the section list)" {...f('title')} multiline={false} />
          <Field label="Short title (next/previous links)" {...f('short')} multiline={false} />
          <Field label="Headline" {...f('headline')} />
          <Field label="Short description" {...f('descr')} />
          <ImageField label="Cover photo (leave empty to hide)" {...f('photo_url')} />
          <div>
            <Label>Article paragraphs</Label>
            <JsonForm name="paragraph" value={s.body} onChange={(v) => setPath(`s.${s.id}.body`, v)} />
          </div>
          <Field label="Pull quote (leave empty to hide)" {...f('quote')} />
          <div>
            <Label>At a glance</Label>
            <div className="space-y-2">
              {s.points.map(([t, d], i) => (
                <div key={i} className="space-y-1 rounded border border-neutral-200 p-2">
                  <input aria-label={`Point ${i + 1} heading`} placeholder="Heading" className="w-full rounded border border-neutral-300 px-2 py-1.5 text-[12px]" value={t} onChange={(e) => setPath(`s.${s.id}.points.${i}.0`, e.target.value)} />
                  <input aria-label={`Point ${i + 1} detail`} placeholder="Detail (optional)" className="w-full rounded border border-neutral-300 px-2 py-1.5 text-[12px]" value={d} onChange={(e) => setPath(`s.${s.id}.points.${i}.1`, e.target.value)} />
                  <button className="text-[11px] text-red-600" onClick={() => setPath(`s.${s.id}.points`, s.points.filter((_, j) => j !== i))}>Remove</button>
                </div>
              ))}
              <button className={ghostCls} onClick={() => setPath(`s.${s.id}.points`, [...s.points, ['', '']])}>+ Add point</button>
            </div>
          </div>
          <div>
            <Label>Image grid (12 columns)</Label>
            <GridEditor
              blocks={draft.blocks[s.id] || []}
              setBlocks={(b) => setDraft((d) => ({ ...d, blocks: { ...d.blocks, [s.id]: b } }))}
              selId={selBlock} setSelId={(id) => { setSelBlock(id); setSelPath(id ? `b.${id}` : null) }}
            />
          </div>
          <Field label="Read time (minutes)" {...f('read_min')} multiline={false} />
          <Field label="Page address (after /section/)" value={s.slug} onChange={(v) => setPath(`s.${s.id}.slug`, slugify(v))} multiline={false} />
          <button className="text-[12px] text-red-600" onClick={() => removeSection(s.id)}>Remove this section</button>
        </div>
      )
    }

    if (cur.name === 'design')
      return (
        <div className="space-y-5 p-4">
          {COLORS.map(([k, l]) => (
            <div key={k}>
              <Label>{l}</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={draft.design[k]} onChange={(e) => setPath(`design.${k}`, e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-neutral-300" />
                <input className="w-28 rounded border border-neutral-300 px-2 py-1.5 text-[12px]" value={draft.design[k]} onChange={(e) => setPath(`design.${k}`, e.target.value)} />
              </div>
            </div>
          ))}
          {[['fontDisplay', 'Heading font'], ['fontBody', 'Body font']].map(([k, l]) => (
            <label key={k} className="block">
              <Label>{l}</Label>
              <select className="w-full rounded border border-neutral-300 px-2 py-2 text-[13px]" value={draft.design[k]} onChange={(e) => setPath(`design.${k}`, e.target.value)}>
                {FONT_CHOICES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
          ))}
          <button className={ghostCls} onClick={() => setDraft((d) => ({ ...d, design: { ...DEFAULT_DESIGN } }))}>Reset to default</button>
        </div>
      )

    if (cur.name === 'brand')
      return (
        <div className="space-y-5 p-4">
          {[['wordmark', 'Wordmark text'], ['headerTag1', 'Header tag'], ['footerNote1', 'Footer line 1'], ['footerNote2', 'Footer line 2'], ['copyright', 'Copyright'], ['emailLabel', 'Footer email link text (empty hides it)'], ['photoCaption', 'Caption under section cover photos']].map(([k, l]) => (
            <Field key={k} label={l} value={draft.brand[k]} onChange={(v) => setPath(`brand.${k}`, v)} multiline={false} />
          ))}
          <ImageField label="Logo image (replaces wordmark)" value={draft.brand.logoUrl} onChange={(v) => setPath('brand.logoUrl', v)} />
        </div>
      )

    if (cur.name === 'details')
      return (
        <div className="space-y-5 p-4">
          <Field label="Label (e.g. Q1 2027)" value={draft.quarter.label} onChange={(v) => setPath('q.label', v)} multiline={false} />
          <Field label="Title" value={draft.quarter.title} onChange={(v) => setPath('q.title', v)} multiline={false} />
          <Field label="Issue number" value={draft.quarter.issue_no} onChange={(v) => setPath('q.issue_no', v)} multiline={false} />
          <Field label="Page address (after /q/)" value={draft.quarter.slug} onChange={(v) => setPath('q.slug', slugify(v))} multiline={false} />
          <div className="space-y-2 rounded-md border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between"><Label>Visibility</Label><StatusBadge q={draft.quarter} /></div>
            {draft.quarter.is_published ? (
              <p className="text-[12px] text-neutral-600">This edition is live. Use Unpublish in the top bar to hide it.</p>
            ) : (
              <label className="block">
                <span className="mb-1 block text-[12px] text-neutral-600">Publish automatically at</span>
                <div className="flex gap-2">
                  <input type="datetime-local" className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-[13px]" value={toLocalInput(draft.quarter.publish_at)} onChange={(e) => setPath('q.publish_at', fromLocalInput(e.target.value))} />
                  {draft.quarter.publish_at && <button className={ghostCls} onClick={() => setPath('q.publish_at', null)}>Clear</button>}
                </div>
                <span className="mt-1 block text-[11px] text-neutral-500">Your local time. Save to apply; it goes live at that moment with no further action.</span>
              </label>
            )}
          </div>
        </div>
      )
    return null
  }

  const sel = 'rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-[12px]'
  return (
    <div className="fixed inset-0 flex bg-neutral-200 font-sans text-neutral-900">
      {/* Sidebar */}
      <aside className="flex w-[360px] shrink-0 flex-col border-r border-neutral-300 bg-neutral-50">
        <div className="flex h-12 items-center gap-2 border-b border-neutral-200 bg-white px-3">
          {stack.length > 1
            ? <button onClick={back} className="rounded px-2 py-1 text-[16px] hover:bg-neutral-100" aria-label="Back">‹</button>
            : <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">CMS</span>}
          <h1 className="flex-1 truncate text-[14px] font-semibold">{titles[cur.name]}{cur.name === 'group' ? ` · ${human(cur.key)}` : ''}</h1>
        </div>
        <div className="flex-1 overflow-y-auto">{renderPanel()}</div>
        <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-3 py-2 text-[11px] text-neutral-500">
          <span className="truncate">{email}</span>
          <span className="flex gap-3"><Link to="/admin/quarters" onClick={(e) => { if (!leaveOk()) e.preventDefault() }} className="hover:text-neutral-900">Quarters</Link><button onClick={() => leaveOk() && onSignOut()} className="hover:text-neutral-900">Sign out</button></span>
        </div>
      </aside>

      {/* Preview */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-300 bg-white px-4">
          <select className={sel} value={qid} onChange={(e) => { if (!dirty || confirm('Discard unsaved changes?')) setQid(e.target.value) }}>
            {quarters.map((q) => <option key={q.id} value={q.id}>{q.label}{isLive(q) ? '' : isScheduled(q) ? ' (scheduled)' : ' (draft)'}</option>)}
          </select>
          <select className={sel} value={page} onChange={(e) => { setPage(e.target.value); setSelPath(null) }}>
            <option value="home">Home page</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.n} · {s.title}</option>)}
          </select>
          <div className="ml-2 flex overflow-hidden rounded-md border border-neutral-300">
            {Object.keys(DEVICES).map((k) => (
              <button key={k} onClick={() => setDevice(k)} className={`px-2.5 py-1.5 text-[11px] capitalize ${device === k ? 'bg-neutral-900 text-white' : 'bg-white'}`}>{k}</button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-md border border-neutral-300">
            <button className="px-2.5 py-1.5 text-[12px] hover:bg-neutral-100 disabled:opacity-30" disabled={!hist.current.past.length} onClick={undo} title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
            <button className="border-l border-neutral-300 px-2.5 py-1.5 text-[12px] hover:bg-neutral-100 disabled:opacity-30" disabled={!hist.current.future.length} onClick={redo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">↷</button>
          </div>
          <span className="flex flex-1 items-center justify-end gap-2 text-[12px]">
            {status ? <span className="text-neutral-500">{status}</span> : dirty ? <><i className="h-2 w-2 rounded-full bg-amber-500" /><span className="text-amber-800">Unsaved changes</span></> : <span className="text-neutral-400">All changes saved</span>}
          </span>
          <StatusBadge q={draft.quarter} />
          <button className={ghostCls} disabled={status === 'Saving…'} onClick={setLive}>{live ? 'Unpublish' : 'Publish now'}</button>
          <a href={`/q/${loadedSlug}`} target="_blank" rel="noreferrer" className={ghostCls}>{live ? 'View live ↗' : 'Open page ↗'}</a>
          {dirty && <button className={ghostCls} onClick={discard}>Discard</button>}
          <button className={btnCls} disabled={!dirty || status === 'Saving…'} onClick={() => save()} title="Save (Ctrl+S)">Save</button>
        </div>
        <div className="flex min-h-0 flex-1 justify-center overflow-auto p-0">
          <iframe
            ref={iframe}
            key={src}
            src={src}
            title="Site preview"
            onLoad={send}
            style={{ width: DEVICES[device] }}
            className="h-full max-w-full border-0 bg-white shadow-lg transition-[width] duration-300"
          />
        </div>
        {toast && (
          <div role={toast.tone === 'error' ? 'alert' : 'status'} className={`fixed bottom-5 right-5 z-50 flex max-w-[420px] items-start gap-3 rounded-lg px-4 py-3 text-[13px] shadow-xl ${toast.tone === 'error' ? 'bg-red-700 text-white' : toast.tone === 'info' ? 'bg-neutral-800 text-white' : 'bg-emerald-700 text-white'}`}>
            <span className="flex-1">{toast.text}</span>
            <button className="opacity-70 hover:opacity-100" aria-label="Dismiss" onClick={() => setToast(null)}>✕</button>
          </div>
        )}
      </div>
    </div>
  )
}
