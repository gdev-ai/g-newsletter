import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isCms } from '../lib/cms.js'
import {
  challengeInfo, challengeLeaderboard, challengePause, challengePauseOnExit, challengePing, challengeResume, challengeStart, challengeSubmit, formatMs, notInstalled, store,
} from '../lib/engagement.js'

// The G Challenge: one timed Sudoku per edition. A player enters their name and company email,
// gets the puzzle from the server (which starts the clock), and the moment the grid is complete
// and consistent it is sent for checking. The server stops the clock, so the leaderboard is fair.

const peers = (() => {
  // For each cell, the 20 cells in its row, column and box.
  const out = []
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3), set = new Set()
    for (let k = 0; k < 9; k++) {
      set.add(r * 9 + k); set.add(k * 9 + c); set.add((br + Math.floor(k / 3)) * 9 + bc + (k % 3))
    }
    set.delete(i)
    out.push([...set])
  }
  return out
})()

const conflictsOf = (grid) => {
  const bad = new Set()
  grid.forEach((v, i) => { if (v && peers[i].some((j) => grid[j] === v)) bad.add(i) })
  return bad
}

const saveKey = (edition) => `g-challenge:${edition}`
const PING_MS = 20000 // check-in interval; the server treats a gap of over 60s as a pause
const IDLE_MS = 120000 // pause automatically after this long without a move

function Leaderboard({ rows, me }) {
  if (!rows?.length) return <p className="text-[13px] text-white/60">No finishers yet. Be the first.</p>
  return (
    <ol className="divide-y divide-white/15 border-y border-white/15">
      {rows.map((r, i) => (
        <li key={i} className={`grid grid-cols-[36px_1fr_auto] items-baseline gap-3 py-3 text-[14px] ${me && r.name === me ? 'text-white' : 'text-white/80'}`}>
          <span className="text-[11px] tabular-nums text-white/50">{String(r.rank).padStart(2, '0')}</span>
          <span className="truncate">{r.name}</span>
          <span className="font-display tabular-nums">{formatMs(Number(r.duration_ms))}</span>
        </li>
      ))}
    </ol>
  )
}

// Clock maths, matching challenge_pause_total in supabase/engagement.sql: pause time comes off the
// clock only up to the pause limit, after which the clock runs again even while paused.
const clockFields = (r) => ({
  started_at: r.started_at, paused_at: r.paused_at || null, paused_ms: Number(r.paused_ms) || 0,
  pause_limit_ms: Number(r.pause_limit_ms) || 0, offset: new Date(r.server_now).getTime() - Date.now(),
})
const serverNow = (g) => Date.now() + (g.offset || 0)
const pauseTotal = (g, now) => Math.min(g.pause_limit_ms || 0, (g.paused_ms || 0) + (g.paused_at ? now - new Date(g.paused_at).getTime() : 0))
const elapsedOf = (g, now) => now - new Date(g.started_at).getTime() - pauseTotal(g, now)

function useServerNow(game, on) {
  const [now, setNow] = useState(() => serverNow(game))
  useEffect(() => {
    if (!on) return undefined
    const t = setInterval(() => setNow(serverNow(game)), 100)
    return () => clearInterval(t)
  }, [game, on])
  return now
}

function Clock({ ms }) {
  return <span className="font-display text-[clamp(28px,2.4vw,44px)] font-light tabular-nums" aria-live="off">{formatMs(ms)}</span>
}

function Board({ puzzle, grid, setGrid, sel, setSel, locked }) {
  const givens = useMemo(() => puzzle.split('').map((c) => c !== '0'), [puzzle])
  const bad = useMemo(() => conflictsOf(grid), [grid])
  const selVal = sel != null ? grid[sel] : 0
  const ref = useRef(null)

  const put = (v) => {
    if (sel == null || givens[sel] || locked) return
    setGrid((g) => g.map((x, i) => (i === sel ? v : x)))
  }
  const onKey = (e) => {
    if (sel == null) return
    const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }
    if (moves[e.key] != null) {
      e.preventDefault()
      const n = sel + moves[e.key]
      if (n >= 0 && n < 81 && !(Math.abs(moves[e.key]) === 1 && Math.floor(n / 9) !== Math.floor(sel / 9))) setSel(n)
    } else if (/^[1-9]$/.test(e.key)) { e.preventDefault(); put(Number(e.key)) }
    else if (['Backspace', 'Delete', '0'].includes(e.key)) { e.preventDefault(); put(0) }
  }
  useEffect(() => { if (sel != null) ref.current?.querySelector(`[data-i="${sel}"]`)?.focus() }, [sel])

  return (
    <div className="w-full max-w-[min(560px,100%)]">
      <div ref={ref} role="grid" aria-label="Sudoku grid" onKeyDown={onKey} className="grid grid-cols-9 border-2 border-ink bg-white text-ink">
        {grid.map((v, i) => {
          const r = Math.floor(i / 9), c = i % 9
          const related = sel != null && (peers[sel].includes(i))
          const same = selVal && v === selVal
          const edge = `${c % 3 === 2 && c < 8 ? 'border-r-2 border-r-ink' : c < 8 ? 'border-r border-r-ink/20' : ''} ${r % 3 === 2 && r < 8 ? 'border-b-2 border-b-ink' : r < 8 ? 'border-b border-b-ink/20' : ''}`
          const bg = i === sel ? 'bg-ink/15' : same ? 'bg-ink/10' : related ? 'bg-ink/[.04]' : ''
          const tone = bad.has(i) ? 'text-red-700' : givens[i] ? 'font-semibold' : 'font-light text-[#334dd2]'
          return (
            <button
              key={i} type="button" data-i={i} role="gridcell"
              tabIndex={i === (sel ?? 0) ? 0 : -1}
              aria-label={`Row ${r + 1}, column ${c + 1}, ${v || 'empty'}${givens[i] ? ', given' : ''}${bad.has(i) ? ', clashes' : ''}`}
              onClick={() => setSel(i)}
              className={`aspect-square font-display text-[clamp(18px,4.6vw,28px)] leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#334dd2] ${edge} ${bg} ${tone}`}
            >
              {v || ''}
            </button>
          )
        })}
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1.5 sm:grid-cols-10" aria-label="Number pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} type="button" disabled={locked} onClick={() => put(n)} className="border border-white/30 py-3 font-display text-[20px] text-white transition hover:bg-white hover:text-ink disabled:opacity-40">{n}</button>
        ))}
        <button type="button" disabled={locked} onClick={() => put(0)} className="border border-white/30 py-3 text-[11px] uppercase tracking-label text-white transition hover:bg-white hover:text-ink disabled:opacity-40">Erase</button>
      </div>
    </div>
  )
}

export default function Sudoku({ edition, title, intro, prize }) {
  const saved = useMemo(() => store.get(saveKey(edition)), [edition])
  const [info, setInfo] = useState(null)
  const [board, setBoard] = useState(null) // top 10
  const [phase, setPhase] = useState(saved?.result ? 'result' : saved?.attempt ? 'playing' : 'intro')
  const [game, setGame] = useState(saved) // { attempt, puzzle, started_at, offset, name, grid, result }
  const [grid, setGrid] = useState(saved?.grid || null)
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({ name: saved?.name || '', email: saved?.email || '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  // A game in progress always comes back hidden after a reload, tab switch or leaving the page.
  const [hidden, setHidden] = useState(Boolean(saved?.attempt && !saved?.result))
  const [pausedBy, setPausedBy] = useState('away') // 'manual' | 'idle' | 'away'
  const lastMove = useRef(Date.now())
  const sentFor = useRef('')

  const refresh = useCallback(async () => {
    try {
      const [i, b] = await Promise.all([challengeInfo(edition), challengeLeaderboard(edition)])
      setInfo(i); setBoard(b)
    } catch (e) {
      setInfo({ exists: false, notInstalled: notInstalled(e), error: !notInstalled(e) })
    }
  }, [edition])
  useEffect(() => { if (!isCms) refresh() }, [refresh])

  // Keep progress in this browser so a reload resumes where the player left off.
  useEffect(() => { if (game) store.set(saveKey(edition), { ...game, grid }) }, [game, grid, edition])

  const begin = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setMsg('')
    try {
      const r = await challengeStart(edition, form.name, form.email)
      if (r.status === 'playing') {
        const g = { attempt: r.attempt, puzzle: r.puzzle, ...clockFields(r), name: r.name, email: form.email }
        setGame(g); setGrid(grid || r.puzzle.split('').map(Number)); setPhase('playing'); setSel(r.puzzle.indexOf('0'))
        // Restarting an attempt that was left paused: keep the grid hidden until they press Resume.
        setHidden(Boolean(r.paused_at)); setPausedBy('away'); lastMove.current = Date.now(); refresh()
      } else if (r.status === 'done') {
        const g = { name: r.name, email: form.email, result: { duration_ms: r.duration_ms, rank: r.rank, already: true } }
        setGame(g); setPhase('result'); refresh()
      } else {
        setMsg({
          bad_email: 'Please use your company email address.',
          bad_name: 'Please enter your name as you would like it on the leaderboard.',
          closed: 'This challenge has closed. Watch for the next edition.',
          missing: 'This challenge is not open yet.',
        }[r.status] || 'Something went wrong. Please try again.')
      }
    } catch {
      setMsg('Could not reach the server. Please try again.')
    }
    setBusy(false)
  }

  // Send the grid as soon as it is full with no clashes (with a unique puzzle, that is the answer).
  useEffect(() => {
    if (phase !== 'playing' || !grid || !game?.attempt) return
    if (grid.some((v) => !v) || conflictsOf(grid).size) return
    const key = grid.join('')
    if (sentFor.current === key) return
    sentFor.current = key
    setBusy(true); setMsg('')
    challengeSubmit(game.attempt, key)
      .then((r) => {
        if (r.status === 'solved') {
          setGame((g) => ({ ...g, result: { duration_ms: r.duration_ms, rank: r.rank } }))
          setPhase('result'); refresh()
        } else if (r.status === 'wrong') setMsg('Not quite. Check your numbers and try again.')
        else if (r.status === 'closed') setMsg('This challenge closed before your grid arrived.')
        else setMsg('Your attempt could not be found. Please start again.')
      })
      .catch(() => { sentFor.current = ''; setMsg('Could not reach the server. Your progress is saved; please try again.') })
      .finally(() => setBusy(false))
  }, [grid, phase, game?.attempt, refresh])

  // Pause hides the grid at once; the server call stops the official clock (within the pause limit).
  const live = useRef({ phase, game, hidden })
  live.current = { phase, game, hidden }
  const merge = (r) => { if (r?.status === 'ok') setGame((g) => (g ? { ...g, ...clockFields(r) } : g)) }
  // `leaving` = the page is closing or the tab is hidden: send the pause so it survives the page shutting.
  const pause = useCallback((reason = 'manual', leaving = false) => {
    const { phase: p, game: g, hidden: h } = live.current
    if (p !== 'playing' || !g?.attempt) return
    if (!h) {
      setHidden(true); setPausedBy(reason)
      setGame((x) => (x && !x.paused_at ? { ...x, paused_at: new Date(serverNow(x)).toISOString() } : x))
    }
    if (leaving) challengePauseOnExit(g.attempt)
    else challengePause(g.attempt).then(merge).catch(() => {})
  }, [])
  const resume = async () => {
    if (!game?.attempt) return
    setBusy(true)
    try { merge(await challengeResume(game.attempt)) } catch { /* clock fields stay as last known */ }
    lastMove.current = Date.now()
    setBusy(false); setHidden(false); setSel((s) => s ?? game.puzzle.indexOf('0'))
  }

  // Pause on reload (so a game left open resumes paused), when the tab is hidden or closed, and when
  // the reader goes to another page of the newsletter (this component unmounts).
  useEffect(() => {
    if (live.current.phase === 'playing') pause('away')
    const onVis = () => { if (document.visibilityState === 'hidden') pause('away', true) }
    const onHide = () => pause('away', true)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onHide)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', onHide); pause('away', true) }
  }, [pause])

  const resetLocal = () => { store.del(saveKey(edition)); setGame(null); setGrid(null); setPhase('intro'); setMsg(''); setHidden(false) }
  const playing = phase === 'playing' && game && grid
  const now = useServerNow(game || {}, Boolean(playing))
  const pauseLeft = playing ? Math.max(0, (game.pause_limit_ms || 0) - pauseTotal(game, now)) : 0

  // While the grid is on screen: check in every 20s so the server knows the game is still open
  // (if check-ins stop, it counts the game as paused from the last one), and pause automatically
  // after 2 minutes without a move. Those 2 minutes count; only the time after is paused.
  const active = Boolean(playing && !hidden)
  useEffect(() => {
    if (!active) return undefined
    const t = setInterval(() => { const g = live.current.game; if (g?.attempt) challengePing(g.attempt).then(merge).catch(() => {}) }, PING_MS)
    return () => clearInterval(t)
  }, [active])
  useEffect(() => {
    if (active && pauseLeft > 0 && Date.now() - lastMove.current >= IDLE_MS) pause('idle')
  }, [active, now, pauseLeft, pause])
  const onGrid = useCallback((update) => { lastMove.current = Date.now(); setGrid(update) }, [])

  const unavailable = info && !info.exists
  const closed = info?.exists && !info.open
  const field = 'w-full border-b border-white/40 bg-transparent py-3 text-[15px] text-white placeholder:text-white/40 focus:border-white focus:outline-none'

  return (
    <div className="grid gap-12 bg-ink p-[clamp(24px,3vw,64px)] text-white lg:grid-cols-[minmax(0,1fr)_minmax(280px,.7fr)]">
      <div>
        {playing ? (
          <>
            <div className="mb-6 flex items-end justify-between gap-6 border-b border-white/20 pb-4">
              <div>
                <p className="label text-white/60">Playing as {game.name}</p>
                <Clock ms={elapsedOf(game, now)} />
              </div>
              <div className="flex flex-col items-end gap-3">
                <p className="max-w-[240px] text-right text-[12px] leading-[1.6] text-white/60">Fill every row, column and 3×3 box with 1–9. Your time stops when the grid is complete.</p>
                {!hidden && (
                  <button type="button" onClick={() => pause('manual')} disabled={busy} className="border border-white/40 px-4 py-2 text-[11px] uppercase tracking-label text-white transition hover:bg-white hover:text-ink disabled:opacity-40">
                    Pause <span aria-hidden="true">❙❙</span>
                  </button>
                )}
              </div>
            </div>
            {hidden ? (
              <div className="flex aspect-square w-full max-w-[min(560px,100%)] flex-col items-center justify-center border-2 border-white/20 px-8 text-center">
                <p className="label text-white/60">Paused</p>
                <p className="mt-4 max-w-[340px] text-[14px] leading-[1.7] text-white/75">
                  {pausedBy === 'idle' && <>Paused after 2 minutes without a move. </>}
                  {pauseLeft > 0
                    ? <>The grid is hidden and your clock is stopped. Pause time left:<span className="tabular-nums text-white">{formatMs(pauseLeft).replace(/\.\d$/, '')}</span></>
                    : 'You have used all your pause time, so the clock is running again.'}
                </p>
                <button type="button" onClick={resume} disabled={busy} className="btn mt-8 !min-w-[200px] disabled:opacity-40">Resume <span aria-hidden="true">→</span></button>
              </div>
            ) : (
              <Board puzzle={game.puzzle} grid={grid} setGrid={onGrid}sel={sel} setSel={setSel} locked={busy} />
            )}
            <p role="status" className="mt-4 min-h-[20px] text-[13px] text-white/80">{busy && !hidden ? 'Checking…' : msg}</p>
          </>
        ) : phase === 'result' && game?.result ? (
          <div className="flex h-full flex-col justify-center py-8">
            <p className="label text-white/60">{game.result.already ? 'Your result' : 'Solved'}</p>
            <p className="mt-6 font-display text-[clamp(64px,7vw,140px)] font-extralight leading-none tracking-[-.04em] tabular-nums">{formatMs(Number(game.result.duration_ms))}</p>
            <p className="mt-6 text-[15px] text-white/80">
              Well done, {game.name}. You are currently <strong className="font-semibold text-white">#{game.result.rank}</strong> on the leaderboard.
            </p>
            {game.result.already && <p className="mt-2 text-[13px] text-white/60">Each person gets one official attempt per edition.</p>}
            <button type="button" onClick={resetLocal} className="mt-10 self-start border-b border-white/50 pb-1 text-[11px] uppercase tracking-label text-white/70 hover:text-white">Not you? Switch player</button>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center py-4">
            <p className="label text-white/60">{title || 'The G Challenge'}</p>
            <h3 className="mt-6 text-[clamp(36px,3.4vw,72px)] text-white">Solve it fastest. Win.</h3>
            {intro && <p className="mt-6 max-w-[520px] text-[15px] leading-[1.8] text-white/75">{intro}</p>}
            {(prize || info?.note) && <p className="mt-4 max-w-[520px] border-l-2 border-[#334dd2] pl-4 text-[14px] leading-[1.7] text-white/90">{info?.note || prize}</p>}
            {unavailable || closed ? (
              <p className="mt-10 text-[14px] text-white/70">
                {closed ? 'This challenge has closed. The winner is announced in the next edition.'
                  : info.notInstalled ? 'The challenge opens soon.' : info.error ? 'The challenge could not be loaded right now.' : 'The challenge opens soon.'}
              </p>
            ) : (
              <form onSubmit={begin} className="mt-10 max-w-[460px] space-y-5">
                <label className="block">
                  <span className="label text-white/60">Your name</span>
                  <input required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} placeholder="As it should appear on the leaderboard" />
                </label>
                <label className="block">
                  <span className="label text-white/60">Company email</span>
                  <input required type="email" maxLength={200} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} placeholder="name@thegdevelopments.com" />
                </label>
                <p className="text-[12px] leading-[1.6] text-white/50">The clock starts when the grid appears. You can pause for up to {formatMs(info?.pause_limit_ms ?? 300000).replace(/\.\d$/, '')} in total; the game pauses itself if you leave the page or go 2 minutes without a move. One official attempt per person; your email is only used to contact the winner.</p>
                {msg && <p role="alert" className="text-[13px] text-red-300">{msg}</p>}
                <button disabled={busy || !info} className="btn !min-w-[220px] disabled:opacity-40">{busy ? 'Starting…' : 'Start the clock'} <span aria-hidden="true">→</span></button>
              </form>
            )}
          </div>
        )}
      </div>

      <aside className="lg:border-l lg:border-white/15 lg:pl-10">
        <p className="label text-white/60">Leaderboard</p>
        {info?.exists && <p className="mt-2 text-[12px] text-white/50">{info.players} playing · {info.solved} solved</p>}
        <div className="mt-6"><Leaderboard rows={board} me={game?.name} /></div>
      </aside>
    </div>
  )
}
