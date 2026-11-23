// Reader engagement calls (poll, G Challenge). All go through the database functions in
// supabase/engagement.sql; the browser never reads raw responses or the puzzle's solution.
import { supabase, supabaseAnonKey, supabaseUrl } from './supabase.js'

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode: works for this visit */ } },
  del(k) { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}
export { store }

// A random id for this browser, so each reader answers the poll once.
export function voterId() {
  let id = store.get('g-voter')
  if (!id) {
    id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-z0-9-]/gi, '')
    store.set('g-voter', id)
  }
  return id
}

// "Function not found" means engagement.sql hasn't been run on this database yet.
export const notInstalled = (error) => error && (error.code === 'PGRST202' || /could not find the function/i.test(error.message || ''))

const tallyOf = (rows) => Object.fromEntries((rows || []).map((r) => [r.choice, Number(r.votes)]))

export async function pollTally(edition) {
  const { data, error } = await supabase.rpc('poll_tally', { p_edition: edition })
  if (error) throw error
  return tallyOf(data)
}

export async function pollRespond(edition, choice, suggestion) {
  const { data, error } = await supabase.rpc('poll_respond', { p_edition: edition, p_voter: voterId(), p_choice: choice, p_suggestion: suggestion || '' })
  if (error) throw error
  return tallyOf(data)
}

const useMock = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('mock-challenge')

const call = async (fn, args) => {
  if (import.meta.env.DEV && useMock) {
    const { mock } = await import('./challengeMock.js')
    return mock[fn](args)
  }
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data
}

export const challengeInfo = (edition) => call('challenge_info', { p_edition: edition })
export const challengeStart = (edition, name, email) => call('challenge_start', { p_edition: edition, p_name: name, p_email: email })
export const challengeSubmit = (attempt, grid) => call('challenge_submit', { p_attempt: attempt, p_grid: grid })
export const challengePause = (attempt) => call('challenge_pause', { p_attempt: attempt })
export const challengeResume = (attempt) => call('challenge_resume', { p_attempt: attempt })
export const challengePing = (attempt) => call('challenge_ping', { p_attempt: attempt })

// Pause sent while the page is closing. A normal request can be cancelled as the tab shuts;
// keepalive tells the browser to finish sending it anyway.
export function challengePauseOnExit(attempt) {
  if (useMock || !supabaseUrl || !supabaseAnonKey) return challengePause(attempt).catch(() => {})
  try {
    fetch(`${supabaseUrl}/rest/v1/rpc/challenge_pause`, {
      method: 'POST', keepalive: true,
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_attempt: attempt }),
    }).catch(() => {})
  } catch { /* nothing more we can do while the page closes */ }
  return undefined
}
export const challengeLeaderboard =(edition, limit = 10) => call('challenge_leaderboard', { p_edition: edition, p_limit: limit })

// 83456 -> "1:23.4"
export function formatMs(ms) {
  if (ms == null) return '—'
  const t = Math.max(0, Math.floor(ms / 100))
  const tenths = t % 10, s = Math.floor(t / 10) % 60, m = Math.floor(t / 600) % 60, h = Math.floor(t / 36000)
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}.${tenths}`
}
