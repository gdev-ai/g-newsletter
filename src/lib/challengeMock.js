// Development only: an in-browser stand-in for the challenge functions in supabase/engagement.sql,
// so the game can be played locally before the SQL is installed. Enable with ?mock-challenge.
// Never included in production builds (see the import.meta.env.DEV guard in engagement.js).
const PUZZLE = '010000694059004070000090050002040080000070001170306920090020046200907000080010000'
const SOLUTION = '318752694659134872427698153962541387835279461174386925591823746243967518786415239'
const PAUSE_LIMIT_MS = 300000
const KEY = 'g-challenge-mock-db'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { attempts: [] } } catch { return { attempts: [] } } }
const save = (d) => localStorage.setItem(KEY, JSON.stringify(d))
const finished = (d) => d.attempts.filter((a) => a.duration_ms != null).sort((x, y) => x.duration_ms - y.duration_ms)
const rank = (d, ms) => finished(d).filter((a) => a.duration_ms < ms).length + 1
const iso = () => new Date().toISOString()
// Same rules as challenge_paused_since / challenge_pause_total in engagement.sql.
const pausedSince = (a) => a.paused_at || (Date.now() - new Date(a.last_seen_at).getTime() > 60000 ? a.last_seen_at : null)
const pauseTotal = (a) => Math.min(PAUSE_LIMIT_MS, (a.paused_ms || 0) + (pausedSince(a) ? Date.now() - new Date(pausedSince(a)).getTime() : 0))
const clock = (a) => ({ started_at: a.started_at, paused_at: pausedSince(a), paused_ms: a.paused_ms || 0, pause_limit_ms: PAUSE_LIMIT_MS, server_now: iso() })

export const mock = {
  challenge_info: () => {
    const d = load()
    return { exists: true, kind: 'sudoku', note: '', closes_at: null, pause_limit_ms: PAUSE_LIMIT_MS, open: true, players: d.attempts.length, solved: finished(d).length }
  },
  challenge_leaderboard: () => finished(load()).slice(0, 10).map((a, i) => ({ rank: i + 1, name: a.name, duration_ms: a.duration_ms })),
  challenge_start: ({ p_name, p_email }) => {
    const d = load()
    const email = String(p_email).trim().toLowerCase()
    if (!/^[^@\s]+@(thegdevelopments\.com|gcommunities\.com)$/.test(email)) return { status: 'bad_email' }
    let a = d.attempts.find((x) => x.email === email)
    if (a?.duration_ms != null) return { status: 'done', name: a.name, duration_ms: a.duration_ms, rank: rank(d, a.duration_ms) }
    if (!a) {
      if (String(p_name).trim().length < 2) return { status: 'bad_name' }
      a = { id: crypto.randomUUID(), name: String(p_name).trim(), email, started_at: iso(), paused_at: null, paused_ms: 0, last_seen_at: iso() }
      d.attempts.push(a); save(d)
    }
    return { status: 'playing', attempt: a.id, name: a.name, puzzle: PUZZLE, ...clock(a) }
  },
  challenge_pause: ({ p_attempt }) => {
    const d = load()
    const a = d.attempts.find((x) => x.id === p_attempt)
    if (!a) return { status: 'missing' }
    if (a.duration_ms == null && !a.paused_at) { a.paused_at = pausedSince(a) || iso(); save(d) }
    return { status: 'ok', ...clock(a) }
  },
  challenge_resume: ({ p_attempt }) => {
    const d = load()
    const a = d.attempts.find((x) => x.id === p_attempt)
    if (!a) return { status: 'missing' }
    if (a.duration_ms == null) { a.paused_ms = pauseTotal(a); a.paused_at = null; a.last_seen_at = iso(); save(d) }
    return { status: 'ok', ...clock(a) }
  },
  challenge_ping: ({ p_attempt }) => {
    const d = load()
    const a = d.attempts.find((x) => x.id === p_attempt)
    if (!a) return { status: 'missing' }
    if (a.duration_ms == null && !a.paused_at) { a.paused_ms = pauseTotal(a); a.last_seen_at = iso(); save(d) }
    return { status: 'ok', ...clock(a) }
  },
  challenge_submit: ({ p_attempt, p_grid }) => {
    const d = load()
    const a = d.attempts.find((x) => x.id === p_attempt)
    if (!a) return { status: 'missing' }
    if (a.duration_ms == null) {
      if (p_grid !== SOLUTION) return { status: 'wrong' }
      a.duration_ms = Date.now() - new Date(a.started_at).getTime() - pauseTotal(a)
      a.paused_ms = pauseTotal(a); a.paused_at = null; a.last_seen_at = iso(); save(d)
    }
    return { status: 'solved', duration_ms: a.duration_ms, rank: rank(d, a.duration_ms) }
  },
}
