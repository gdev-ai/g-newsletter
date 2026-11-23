import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { btnCls, Field, ghostCls } from './fields.jsx'

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function Quarters() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  const load = () => supabase.from('quarters').select('*').order('sort', { ascending: false }).then(({ data }) => setList(data || []))
  useEffect(() => { load() }, [])

  const togglePublish = async (q) => {
    await supabase.from('quarters').update({ is_published: !q.is_published }).eq('id', q.id)
    load()
  }

  const remove = async (q) => {
    if (!confirm(`Delete ${q.label} and all its sections? This cannot be undone.`)) return
    await supabase.from('quarters').delete().eq('id', q.id)
    load()
  }

  // Creates a quarter as a copy of an existing one (content, sections and grid blocks).
  const create = async () => {
    setBusy(true)
    const src = list.find((q) => q.id === form.copyFrom) || list[0]
    const sort = Math.max(0, ...list.map((q) => q.sort)) + 1
    const { data: q, error } = await supabase.from('quarters').insert({
      slug: slugify(form.label), label: form.label, title: form.title,
      issue_no: Number(form.issue) || list.length + 1, sort, is_published: false,
      content: src?.content || {},
    }).select().single()
    if (error) { alert(error.message); return setBusy(false) }

    if (src) {
      const { data: secs } = await supabase.from('sections').select('*').eq('quarter_id', src.id)
      for (const s of secs || []) {
        const { id: oldId, quarter_id, ...rest } = s
        const { data: ns } = await supabase.from('sections').insert({ ...rest, quarter_id: q.id }).select().single()
        const { data: blocks } = await supabase.from('section_blocks').select('*').eq('section_id', oldId)
        if (blocks?.length && ns)
          await supabase.from('section_blocks').insert(blocks.map(({ id, section_id, ...b }) => ({ ...b, section_id: ns.id })))
      }
    }
    setBusy(false)
    nav(`/admin?q=${q.id}`)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[22px] font-semibold tracking-tight">Quarters</h1>
        <button className={btnCls} onClick={() => setForm({ label: '', title: '', issue: list.length + 1, copyFrom: list[0]?.id })}>+ New quarter</button>
      </div>

      {form && (
        <div className="mb-6 space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-[14px] font-semibold">New quarter</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Label (e.g. Q2 2027)" value={form.label} onChange={(v) => setForm({ ...form, label: v })} multiline={false} />
            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} multiline={false} />
            <Field label="Issue number" value={form.issue} onChange={(v) => setForm({ ...form, issue: v })} multiline={false} />
          </div>
          <label className="block text-[12px]">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">Start from</span>
            <select className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[13px]" value={form.copyFrom} onChange={(e) => setForm({ ...form, copyFrom: e.target.value })}>
              {list.map((q) => <option key={q.id} value={q.id}>{q.label} — {q.title}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button className={btnCls} disabled={!form.label || !form.title || busy} onClick={create}>{busy ? 'Creating…' : 'Create draft'}</button>
            <button className={ghostCls} onClick={() => setForm(null)}>Cancel</button>
          </div>
          <p className="text-[11px] text-neutral-500">The new quarter is a draft copy. Edit it, then publish when ready.</p>
        </div>
      )}

      <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {list.map((q) => (
          <div key={q.id} className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <Link to={`/admin?q=${q.id}`} className="text-[14px] font-medium hover:underline">{q.label} — {q.title}</Link>
              <p className="text-[11px] text-neutral-500">/q/{q.slug} · Issue {q.issue_no}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${q.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'}`}>{q.is_published ? 'Published' : 'Draft'}</span>
            <a href={`/q/${q.slug}`} target="_blank" rel="noreferrer" className={ghostCls}>View</a>
            <button className={ghostCls} onClick={() => togglePublish(q)}>{q.is_published ? 'Unpublish' : 'Publish'}</button>
            <Link to={`/admin?q=${q.id}`} className={ghostCls}>Edit</Link>
            <button className="text-[11px] text-red-600" onClick={() => remove(q)}>Delete</button>
          </div>
        ))}
        {!list.length && <p className="p-6 text-[13px] text-neutral-500">No quarters yet.</p>}
      </div>
    </div>
  )
}
