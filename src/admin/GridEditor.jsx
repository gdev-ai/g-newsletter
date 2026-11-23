import { useState } from 'react'
import { Field, ghostCls, ImageField, inputCls, Label } from './fields.jsx'
import { BLOCK_TYPES } from '../blocks/Blocks.jsx'

const TYPES = Object.entries(BLOCK_TYPES).map(([t, d]) => [t, d.label])

// Fields for the richer block types: plain text inputs for strings and numbers, JSON for lists.
function ContentFields({ content, onChange }) {
  const [drafts, setDrafts] = useState({})
  return Object.entries(content).map(([k, v]) => {
    if (typeof v === 'string' || typeof v === 'number')
      return <Field key={k} label={k} value={String(v)} onChange={(x) => onChange({ [k]: typeof v === 'number' ? Number(x) || 0 : x })} />
    const text = drafts[k] ?? JSON.stringify(v, null, 1)
    let bad = false
    try { JSON.parse(text) } catch { bad = true }
    return (
      <label key={k} className="block">
        <Label>{k} (JSON)</Label>
        <textarea rows={6} className={`${inputCls} font-mono text-[11px] ${bad ? 'border-red-500' : ''}`} value={text}
          onChange={(e) => {
            setDrafts({ ...drafts, [k]: e.target.value })
            try { onChange({ [k]: JSON.parse(e.target.value) }) } catch { /* keep editing */ }
          }} />
      </label>
    )
  })
}
const SPANS = [[12, 'Full'], [8, '2/3'], [6, 'Half'], [4, '1/3'], [3, '1/4']]

// Places blocks exactly as CSS grid auto-placement does on desktop (12 columns, row-major),
// then reports rows with empty cells, which show up as gaps on the page.
export function layoutWarnings(blocks) {
  const taken = []
  const free = (r, c, w, h) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (taken[y]?.[x]) return false
    return true
  }
  let row = 0, col = 0, bottom = 0
  for (const b of blocks) {
    const w = Math.min(12, Math.max(1, b.col_span || 12)), h = Math.max(1, b.row_span || 1)
    for (;;) {
      if (col + w > 12) { row++; col = 0; continue }
      if (free(row, col, w, h)) break
      col++
    }
    for (let y = row; y < row + h; y++) { taken[y] ||= []; for (let x = col; x < col + w; x++) taken[y][x] = true }
    bottom = Math.max(bottom, row + h)
    col += w
  }
  const gaps = []
  for (let y = 0; y < bottom; y++) {
    const empty = 12 - (taken[y] || []).filter(Boolean).length
    if (empty) gaps.push([y + 1, empty])
  }
  if (!gaps.length) return []
  const cells = gaps.reduce((n, [, e]) => n + e, 0)
  return [`${cells} empty cell${cells === 1 ? '' : 's'} leave gaps in row${gaps.length === 1 ? '' : 's'} ${gaps.map(([r]) => r).join(', ')} on desktop. Adjust widths or heights so each row adds up to 12 columns.`]
}

// Sidebar editor for a section's 12-column content grid.
export default function GridEditor({ blocks, setBlocks, selId, setSelId }) {
  const idx = blocks.findIndex((b) => b.id === selId)
  const b = idx >= 0 ? blocks[idx] : null
  const upd = (patch) => setBlocks(blocks.map((x) => (x.id === selId ? { ...x, ...patch } : x)))
  const updContent = (patch) => upd({ content: { ...b.content, ...patch } })
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const warnings = layoutWarnings(blocks)
  const dropOn = (targetId) => {
    if (!dragId || dragId === targetId) return
    const from = blocks.findIndex((x) => x.id === dragId)
    const to = blocks.findIndex((x) => x.id === targetId)
    const next = [...blocks]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setBlocks(next)
  }

  const add = (type) => {
    const id = `new-${Date.now()}`
    const content = structuredClone(BLOCK_TYPES[type]?.content || { text: '' })
    const wide = ['steps', 'challenge'].includes(type)
    setBlocks([...blocks, { id, type, col_span: wide ? 12 : type === 'image' ? 6 : 4, row_span: type === 'image' ? 3 : 2, content }])
    setSelId(id)
  }
  const move = (d) => {
    const j = idx + d
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]; [next[idx], next[j]] = [next[j], next[idx]]
    setBlocks(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map(([t, l]) => <button key={t} className={ghostCls} onClick={() => add(t)}>+ {l}</button>)}
      </div>

      <div className="relative rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-2">
        {/* column guides */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-2 grid grid-cols-12 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => <div key={i} className="rounded-sm bg-sky-100/70" />)}
        </div>
        <div className="relative grid min-h-[34px] auto-rows-[34px] grid-cols-12 gap-1.5">
        {blocks.map((x) => (
          <button
            key={x.id}
            draggable
            onDragStart={(e) => { setDragId(x.id); e.dataTransfer.effectAllowed = 'move' }}
            onDragOver={(e) => { e.preventDefault(); setOverId(x.id) }}
            onDragLeave={() => setOverId((o) => (o === x.id ? null : o))}
            onDrop={(e) => { e.preventDefault(); dropOn(x.id); setDragId(null); setOverId(null) }}
            onDragEnd={() => { setDragId(null); setOverId(null) }}
            onClick={() => setSelId(x.id)}
            title="Click to edit · drag to reorder"
            style={{ gridColumn: `span ${Math.min(12, x.col_span)}`, gridRow: `span ${x.row_span}` }}
            className={`relative cursor-grab overflow-hidden rounded border text-left text-[11px] active:cursor-grabbing ${selId === x.id ? 'border-[#2271b1] ring-2 ring-[#2271b1]' : 'border-neutral-300'} ${overId === x.id && dragId !== x.id ? 'ring-2 ring-amber-500' : ''} ${dragId === x.id ? 'opacity-40' : ''} ${x.type === 'quote' ? 'bg-neutral-900 text-white' : 'bg-white'}`}
          >
            {x.type === 'image' && x.content.url
              ? <img src={x.content.url} alt="" className="h-full w-full object-cover" />
              : <span className="line-clamp-3 block p-1.5">{x.type === 'image' ? 'Image' : x.content.text || `Empty ${x.type}`}</span>}
          </button>
        ))}
        {!blocks.length && <p className="col-span-12 row-span-2 grid place-items-center bg-neutral-50/80 text-center text-[11px] text-neutral-500">No blocks yet. Add one above.</p>}
        </div>
      </div>
      {blocks.length > 1 && <p className="text-[11px] text-neutral-500">Drag blocks to reorder them. On phones they stack in this order.</p>}
      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {warnings.map((w) => <li key={w}>⚠ {w}</li>)}
        </ul>
      )}

      {b && (
        <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold capitalize">{b.type} block</h3>
            <div className="flex gap-1.5">
              <button className={ghostCls} onClick={() => move(-1)} disabled={idx === 0}>←</button>
              <button className={ghostCls} onClick={() => move(1)} disabled={idx === blocks.length - 1}>→</button>
              <button className="px-1 text-[11px] text-red-600" onClick={() => { setBlocks(blocks.filter((x) => x.id !== selId)); setSelId(null) }}>Delete</button>
            </div>
          </div>
          <div>
            <Label>Width</Label>
            <div className="flex flex-wrap gap-1.5">
              {SPANS.map(([n, l]) => (
                <button key={n} onClick={() => upd({ col_span: n })} className={`rounded border px-2.5 py-1 text-[11px] ${b.col_span === n ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300'}`}>{l}</button>
              ))}
            </div>
            <input type="range" min="1" max="12" value={b.col_span} onChange={(e) => upd({ col_span: Number(e.target.value) })} className="mt-2 w-full" />
            <p className="text-[11px] text-neutral-500">{b.col_span} of 12 columns</p>
          </div>
          <div>
            <Label>Height ({b.row_span} rows)</Label>
            <input type="range" min="1" max="6" value={b.row_span} onChange={(e) => upd({ row_span: Number(e.target.value) })} className="w-full" />
          </div>
          {b.type === 'image' ? (
            <>
              <ImageField label="Image" value={b.content.url} onChange={(v) => updContent({ url: v })} />
              <Field label="Caption" value={b.content.caption} onChange={(v) => updContent({ caption: v })} multiline={false} />
              <Field label="Alt text" value={b.content.alt} onChange={(v) => updContent({ alt: v })} multiline={false} />
            </>
          ) : ['text', 'heading'].includes(b.type) ? (
            <Field label="Text" value={b.content.text} onChange={(v) => updContent({ text: v })} multiline rows={4} />
          ) : (
            <ContentFields key={b.id} content={{ ...(BLOCK_TYPES[b.type]?.content || {}), ...b.content }} onChange={updContent} />
          )}
        </div>
      )}
    </div>
  )
}
