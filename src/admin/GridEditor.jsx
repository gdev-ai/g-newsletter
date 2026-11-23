import { Field, ghostCls, ImageField, Label } from './fields.jsx'

const TYPES = [['image', 'Image'], ['text', 'Text'], ['heading', 'Heading'], ['quote', 'Quote']]
const SPANS = [[12, 'Full'], [8, '2/3'], [6, 'Half'], [4, '1/3'], [3, '1/4']]

// Sidebar editor for a section's 12-column content grid.
export default function GridEditor({ blocks, setBlocks, selId, setSelId }) {
  const idx = blocks.findIndex((b) => b.id === selId)
  const b = idx >= 0 ? blocks[idx] : null
  const upd = (patch) => setBlocks(blocks.map((x) => (x.id === selId ? { ...x, ...patch } : x)))
  const updContent = (patch) => upd({ content: { ...b.content, ...patch } })

  const add = (type) => {
    const id = `new-${Date.now()}`
    const content = type === 'image' ? { url: '', alt: '', caption: '' } : { text: '' }
    setBlocks([...blocks, { id, type, col_span: type === 'image' ? 6 : 4, row_span: type === 'image' ? 3 : 2, content }])
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

      <div className="grid auto-rows-[34px] grid-cols-12 gap-1.5 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-2">
        {blocks.map((x) => (
          <button
            key={x.id}
            onClick={() => setSelId(x.id)}
            style={{ gridColumn: `span ${x.col_span}`, gridRow: `span ${x.row_span}` }}
            className={`relative overflow-hidden rounded border text-left text-[10px] ${selId === x.id ? 'border-[#2271b1] ring-2 ring-[#2271b1]' : 'border-neutral-300'} ${x.type === 'quote' ? 'bg-neutral-900 text-white' : 'bg-white'}`}
          >
            {x.type === 'image' && x.content.url
              ? <img src={x.content.url} alt="" className="h-full w-full object-cover" />
              : <span className="line-clamp-3 block p-1.5">{x.type === 'image' ? 'Image' : x.content.text || `Empty ${x.type}`}</span>}
          </button>
        ))}
        {!blocks.length && <p className="col-span-12 p-4 text-center text-[11px] text-neutral-500">No blocks yet. Add one above.</p>}
      </div>

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
            <p className="text-[10px] text-neutral-500">{b.col_span} of 12 columns</p>
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
          ) : (
            <Field label="Text" value={b.content.text} onChange={(v) => updContent({ text: v })} multiline rows={4} />
          )}
        </div>
      )}
    </div>
  )
}
