import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getIn, setIn } from '../lib/cms.js'
import { DEFAULT_DESIGN, FONT_CHOICES } from '../lib/theme.js'
import { DEFAULT_BRAND, useSite } from '../lib/site.jsx'
import { btnCls, Field, ghostCls, ImageField, JsonForm, Label } from './fields.jsx'
import GridEditor from './GridEditor.jsx'

const GROUPS = [
  ['hero', 'Hero'], ['intro', 'Editor’s note'], ['stories', 'Quarterly highlights'], ['directory', 'Section directory'],
  ['ai', 'AI Corner'], ['poll', 'Poll'], ['challenge', 'Take a break'], ['archive', 'Archive'], ['images', 'All images'],
]
const COLORS = [['paper', 'Page background'], ['stone', 'Panel background'], ['ink', 'Text & dark sections'], ['soot', 'Secondary text']]
const DEVICES = { desktop: '100%', tablet: '768px', mobile: '390px' }
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const human = (k) => k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const isImagePath = (p) => /(^|\.)images\./.test(p) || /photo_url$|logoUrl$/.test(p)
const clone = (x) => JSON.parse(JSON.stringify(x))

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
  const iframe = useRef(null)
  const snap = useRef(null)
  const draftRef = useRef(null)
  const selRef = useRef(null)
  draftRef.current = draft
  selRef.current = selPath

  const dirty = draft && snap.current && JSON.stringify(draft) !== JSON.stringify(snap.current)

  const loadDraft = useCallback(async (id) => {
    const [{ data: quarter }, { data: sections }, { data: settings }] = await Promise.all([
      supabase.from('quarters').select('*').eq('id', id).single(),
      supabase.from('sections').select('*').eq('quarter_id', id).order('position'),
      supabase.from('site_settings').select('key,value'),
    ])
    const ids = (sections || []).map((s) => s.id)
    const { data: blocks } = ids.length ? await supabase.from('section_blocks').select('*').in('section_id', ids).order('position') : { data: [] }
    const byS = Object.fromEntries(ids.map((i) => [i, []]))
    ;(blocks || []).forEach((b) => byS[b.section_id].push(b))
    const val = (k, d) => ({ ...d, ...(settings?.find((s) => s.key === k)?.value || {}) })
    const d = { quarter, sections: sections || [], blocks: byS, design: val('design', DEFAULT_DESIGN), brand: val('brand', DEFAULT_BRAND) }
    snap.current = clone(d)
    setLoadedSlug(quarter.slug)
    setDraft(d)
  }, [])

  useEffect(() => {
    supabase.from('quarters').select('id,slug,label,title,is_published,sort').order('sort', { ascending: false }).then(({ data }) => {
      setQuarters(data || [])
      const first = params.get('q') || data?.[0]?.id
      if (first) setQid(first)
    })
  }, [])
  useEffect(() => { if (qid) { setPage('home'); setStack([{ name: 'root' }]); setSelPath(null); loadDraft(qid) } }, [qid, loadDraft])

  // ---- preview bridge ----
  const send = useCallback(() => {
    const w = iframe.current?.contentWindow
    if (!w || !draftRef.current) return
    w.postMessage({ type: 'cms:state', state: draftRef.current }, '*')
    w.postMessage({ type: 'cms:selected', path: selRef.current }, '*')
  }, [])
  useEffect(() => { send() }, [draft, selPath, send])

  useEffect(() => {
    const on = (e) => {
      if (e.data?.type === 'cms:ready') send()
      if (e.data?.type === 'cms:select') select(e.data.path)
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
  const save = async () => {
    setStatus('Saving…')
    const s0 = snap.current, d = draft
    const errs = []
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    if (!same(d.quarter, s0.quarter)) {
      const { label, title, issue_no, slug, content, is_published } = d.quarter
      const r = await supabase.from('quarters').update({ label, title, issue_no: Number(issue_no) || 1, slug, content, is_published, updated_at: new Date().toISOString() }).eq('id', qid)
      if (r.error) errs.push(r.error.message)
    }
    for (const s of d.sections) {
      const old = s0.sections.find((x) => x.id === s.id)
      if (!same(s, old)) {
        const { id, quarter_id, ...f } = s
        const r = await supabase.from('sections').update({ ...f, read_min: Number(s.read_min) || 1 }).eq('id', id)
        if (r.error) errs.push(r.error.message)
      }
      if (!same(d.blocks[s.id], s0.blocks[s.id])) {
        await supabase.from('section_blocks').delete().eq('section_id', s.id)
        const rows = (d.blocks[s.id] || []).map((b, i) => ({ section_id: s.id, position: i + 1, type: b.type, col_span: b.col_span, row_span: b.row_span, content: b.content }))
        if (rows.length) { const r = await supabase.from('section_blocks').insert(rows); if (r.error) errs.push(r.error.message) }
      }
    }
    for (const k of ['design', 'brand'])
      if (!same(d[k], s0[k])) {
        const r = await supabase.from('site_settings').upsert({ key: k, value: d[k], updated_at: new Date().toISOString() })
        if (r.error) errs.push(r.error.message)
      }
    if (errs.length) setStatus(errs[0])
    else { await loadDraft(qid); site.reload(); setStatus('Saved ✓') }
    setTimeout(() => setStatus(''), 3000)
  }

  const addSection = async () => {
    const n = String(draft.sections.length + 1).padStart(2, '0')
    const { data, error } = await supabase.from('sections').insert({
      quarter_id: qid, slug: `section-${Date.now().toString(36)}`, n, position: draft.sections.length + 1, title: 'New section', short: 'New section',
      descr: 'Short description.', headline: 'Headline goes here.', quote: 'A short pull quote.', points: [['Point one', ''], ['Point two', ''], ['Point three', '']], body: ['Write the opening paragraph.'],
    }).select().single()
    if (error) return alert(error.message)
    snap.current = { ...snap.current, sections: [...snap.current.sections, clone(data)], blocks: { ...snap.current.blocks, [data.id]: [] } }
    setDraft((d) => ({ ...d, sections: [...d.sections, data], blocks: { ...d.blocks, [data.id]: [] } }))
    setPage(data.id); push({ name: 'section', sid: data.id })
  }
  const removeSection = async (sid) => {
    if (!confirm('Delete this section? This cannot be undone.')) return
    await supabase.from('sections').delete().eq('id', sid)
    snap.current = { ...snap.current, sections: snap.current.sections.filter((s) => s.id !== sid) }
    setDraft((d) => ({ ...d, sections: d.sections.filter((s) => s.id !== sid) }))
    setPage('home'); setStack([{ name: 'root' }, { name: 'sections' }])
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
          <p className="px-4 py-4 text-[11px] text-neutral-500">Tip: click any text or image in the preview to edit it here.</p>
        </div>
      )

    if (cur.name === 'home')
      return <div>{GROUPS.map(([k, l]) => <Row key={k} title={l} onClick={() => push({ name: 'group', key: k })} />)}</div>

    if (cur.name === 'group')
      return <div className="p-4"><JsonForm value={draft.quarter.content[cur.key]} name={cur.key} onChange={(v) => setPath(`c.${cur.key}`, v)} /></div>

    if (cur.name === 'edit') {
      const path = cur.path
      const val = getPath(path)
      const keys = path.split('.')
      const label = human(keys[keys.length - 1] === '0' || /^\d+$/.test(keys[keys.length - 1]) ? keys[keys.length - 2] : keys[keys.length - 1])
      return (
        <div className="space-y-5 p-4">
          {isImagePath(path)
            ? <ImageField label={label} value={val} onChange={(v) => setPath(path, v)} />
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
          <Field label="Title (directory)" {...f('title')} multiline={false} />
          <Field label="Short title" {...f('short')} multiline={false} />
          <Field label="Headline" {...f('headline')} />
          <Field label="Description" {...f('descr')} />
          <ImageField label="Cover photo" {...f('photo_url')} />
          <div>
            <Label>Article paragraphs</Label>
            <JsonForm name="paragraph" value={s.body} onChange={(v) => setPath(`s.${s.id}.body`, v)} />
          </div>
          <Field label="Pull quote" {...f('quote')} />
          <div>
            <Label>At a glance</Label>
            <div className="space-y-2">
              {s.points.map(([t, d], i) => (
                <div key={i} className="space-y-1 rounded border border-neutral-200 p-2">
                  <input className="w-full rounded border border-neutral-300 px-2 py-1.5 text-[12px]" value={t} onChange={(e) => setPath(`s.${s.id}.points.${i}.0`, e.target.value)} />
                  <input className="w-full rounded border border-neutral-300 px-2 py-1.5 text-[12px]" value={d} onChange={(e) => setPath(`s.${s.id}.points.${i}.1`, e.target.value)} />
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
          <Field label="URL slug" value={s.slug} onChange={(v) => setPath(`s.${s.id}.slug`, slugify(v))} multiline={false} />
          <button className="text-[12px] text-red-600" onClick={() => removeSection(s.id)}>Delete this section</button>
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
          {[['wordmark', 'Wordmark text'], ['headerTag1', 'Header tag'], ['footerNote1', 'Footer line 1'], ['footerNote2', 'Footer line 2'], ['copyright', 'Copyright']].map(([k, l]) => (
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
          <Field label="URL slug" value={draft.quarter.slug} onChange={(v) => setPath('q.slug', slugify(v))} multiline={false} />
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
          <span className="flex gap-3"><Link to="/admin/quarters" className="hover:text-neutral-900">Quarters</Link><button onClick={onSignOut} className="hover:text-neutral-900">Sign out</button></span>
        </div>
      </aside>

      {/* Preview */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-300 bg-white px-4">
          <select className={sel} value={qid} onChange={(e) => { if (!dirty || confirm('Discard unsaved changes?')) setQid(e.target.value) }}>
            {quarters.map((q) => <option key={q.id} value={q.id}>{q.label}{q.is_published ? '' : ' (draft)'}</option>)}
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
          <span className="flex-1 text-right text-[12px] text-neutral-500">{status || (dirty ? 'Unsaved changes' : '')}</span>
          <button className={ghostCls} onClick={() => setPath('q.is_published', !draft.quarter.is_published)}>{draft.quarter.is_published ? 'Published ✓' : 'Draft'}</button>
          <a href={`/q/${loadedSlug}`} target="_blank" rel="noreferrer" className={ghostCls}>View live ↗</a>
          <button className={btnCls} disabled={!dirty} onClick={save}>Save</button>
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
      </div>
    </div>
  )
}
