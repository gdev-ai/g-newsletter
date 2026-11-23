import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase.js'
import { btnCls, Field, ghostCls } from './fields.jsx'
import { isLive, isScheduled } from '../lib/edition.js'

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function Quarters() {
  const [list, setList] = useState(null)
  const [votes, setVotes] = useState({})
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()

  const load = async () => {
    const [q, v] = await Promise.all([
      supabase.from('quarters').select('*').order('sort', { ascending: false }),
      supabase.rpc('poll_results'),
    ])
    if (q.error) return setError(`Could not load editions: ${errorText(q.error)}`)
    setList(q.data)
    const byQ = {}
    ;(v.data || []).forEach((r) => { (byQ[r.quarter_id] ||= []).push(r) })
    setVotes(byQ)
  }
  useEffect(() => { load() }, [])

  // Runs a write, then reloads; any failure is shown instead of being silently ignored.
  const run = async (fn) => {
    setError('')
    const { error: err } = await fn()
    if (err) setError(errorText(err))
    load()
  }
  const togglePublish = (q) => {
    const live = isLive(q)
    if (!confirm(live ? `Unpublish ${q.label}? Readers will no longer see it.` : `Publish ${q.label} now? Readers will see it immediately.`)) return
    run(() => supabase.from('quarters').update(live ? { is_published: false, publish_at: null } : { is_published: true }).eq('id', q.id))
  }
  const remove = (q) => {
    if (!confirm(`Delete ${q.label} and all its sections and poll votes? This cannot be undone.`)) return
    run(() => supabase.from('quarters').delete().eq('id', q.id))
  }

  // Creates a draft as a full copy of an existing edition (content, sections, grids) in one transaction.
  const create = async () => {
    setBusy(true); setError('')
    const slug = slugify(form.label)
    if (list.some((q) => q.slug === slug)) { setBusy(false); return setError(`An edition with the link /q/${slug} already exists. Choose another label.`) }
    const { data: id, error: err } = await supabase.rpc('copy_quarter', {
      p_source: form.copyFrom || null, p_slug: slug, p_label: form.label.trim(), p_title: form.title.trim(),
      p_issue: Math.max(1, parseInt(form.issue, 10) || list.length + 1),
    })
    setBusy(false)
    if (err) return setError(`Could not create the edition: ${errorText(err)}`)
    nav(`/admin?q=${id}`)
  }

  if (!list)
    return error
      ? <div className="mx-auto max-w-4xl space-y-4"><p className="text-[13px] text-red-700">{error}</p><button className={btnCls} onClick={() => { setError(''); load() }}>Try again</button></div>
      : <p className="text-center text-[13px] text-neutral-500">Loading…</p>

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[22px] font-semibold tracking-tight">Quarters</h1>
        <button className={btnCls} disabled={!list.length} title={list.length ? '' : 'Run supabase/schema.sql to create the first edition'} onClick={() => setForm({ label: '', title: '', issue: list.length + 1, copyFrom: list[0].id })}>+ New quarter</button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</p>}

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
            <button className={btnCls} disabled={!slugify(form.label) || !form.title.trim() || busy} onClick={create}>{busy ? 'Creating…' : 'Create draft'}</button>
            <button className={ghostCls} onClick={() => setForm(null)}>Cancel</button>
          </div>
          <p className="text-[11px] text-neutral-500">The new quarter is a draft copy. Edit it, then publish when ready.</p>
        </div>
      )}

      <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {list.map((q) => {
          const v = votes[q.id] || []
          const total = v.reduce((n, r) => n + Number(r.votes), 0)
          return (
            <div key={q.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <Link to={`/admin?q=${q.id}`} className="text-[14px] font-medium hover:underline">{q.label} — {q.title}</Link>
                <p className="text-[11px] text-neutral-500">/q/{q.slug} · Issue {q.issue_no}</p>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Poll: {total ? `${total} vote${total === 1 ? '' : 's'} — ${v.map((r) => `${r.choice} ${Math.round((r.votes / total) * 100)}%`).join(' · ')}` : 'no votes yet'}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${isLive(q) ? 'bg-emerald-100 text-emerald-800' : isScheduled(q) ? 'bg-sky-100 text-sky-800' : 'bg-neutral-200 text-neutral-700'}`}>
                {isLive(q) ? 'Live' : isScheduled(q) ? `Scheduled · ${new Date(q.publish_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Draft'}
              </span>
              <a href={`/q/${q.slug}`} target="_blank" rel="noreferrer" className={ghostCls}>View</a>
              <button className={ghostCls} onClick={() => togglePublish(q)}>{isLive(q) ? 'Unpublish' : 'Publish now'}</button>
              <Link to={`/admin?q=${q.id}`} className={ghostCls}>Edit</Link>
              <button className="text-[11px] text-red-600" onClick={() => remove(q)}>Delete</button>
            </div>
          )
        })}
        {!list.length && <p className="p-6 text-[13px] text-neutral-500">No quarters yet.</p>}
      </div>
    </div>
  )
}
