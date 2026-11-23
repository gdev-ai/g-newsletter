import { useEffect, useState } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase.js'
import { btnCls, inputCls, Label } from './fields.jsx'
import Quarters from './Quarters.jsx'
import Editor from './Editor.jsx'
import { ArrowLeft } from 'lucide-react'

function Login({ error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(error || '')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setMsg(errorText(err))
    setBusy(false)
  }
  return (
    <div className="grid min-h-screen place-items-center bg-neutral-100 p-6 font-sans">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-neutral-900">Journal CMS</h1>
          <p className="mt-1 text-[12px] text-neutral-500">Sign in to edit the newsletter.</p>
        </div>
        <label className="block"><Label>Email</Label><input type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block"><Label>Password</Label><input type="password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {msg && <p className="text-[12px] text-red-600">{msg}</p>}
        <button className={`${btnCls} w-full`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}

export default function Admin() {
  const [state, setState] = useState({ loading: true, session: null, isAdmin: false, error: '' })
  const [attempt, setAttempt] = useState(0)
  const nav = useNavigate()

  useEffect(() => {
    let live = true
    const check = async (session) => {
      if (!session) return live && setState({ loading: false, session: null, isAdmin: false, error: '' })
      const { data, error } = await supabase.from('admins').select('email').limit(1)
      if (live) setState({ loading: false, session, isAdmin: !!data?.length, error: error ? errorText(error) : '' })
    }
    // Fires once with the current session (INITIAL_SESSION), then on every sign-in/out.
    // Supabase calls are deferred out of the callback, as the auth client requires.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setTimeout(() => check(s), 0) })
    return () => { live = false; sub.subscription.unsubscribe() }
  }, [attempt])

  if (state.loading) return <div className="grid min-h-screen place-items-center bg-neutral-100 text-[12px] text-neutral-500">Loading…</div>
  if (!state.session) return <Login />
  if (state.error)
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-100 p-6 text-center font-sans">
        <div className="space-y-4">
          <p className="text-[14px] text-neutral-800">Could not check your access.</p>
          <p className="text-[12px] text-neutral-500">{state.error}</p>
          <button className={btnCls} onClick={() => { setState((s) => ({ ...s, loading: true })); setAttempt((n) => n + 1) }}>Try again</button>
        </div>
      </div>
    )
  if (!state.isAdmin)
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-100 p-6 text-center font-sans">
        <div className="space-y-4">
          <p className="text-[14px] text-neutral-800">{state.session.user.email} is not an admin.</p>
          <button className={btnCls} onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    )

  const out = async () => { await supabase.auth.signOut(); nav('/admin') }
  const email = state.session.user.email
  return (
    <Routes>
      <Route index element={<Editor email={email} onSignOut={out} />} />
      <Route
        path="quarters"
        element={
          <div className="min-h-screen bg-neutral-100 font-sans text-neutral-900">
            <div className="flex h-12 items-center justify-between border-b border-neutral-200 bg-white px-6 text-[13px]">
              <Link to="/admin" className="font-medium"><ArrowLeft aria-hidden="true" className="inline-block h-[1em] w-[1em] align-[-0.125em]" strokeWidth={1.75} /> Back to editor</Link>
              <button onClick={out} className="text-neutral-600 hover:text-neutral-900">Sign out</button>
            </div>
            <div className="p-8"><Quarters /></div>
          </div>
        }
      />
    </Routes>
  )
}
