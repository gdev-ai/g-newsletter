import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, errorText } from './supabase.js'
import { applyTheme, DEFAULT_DESIGN } from './theme.js'
import { isCms } from './cms.js'
import { editionVars, fillDeep, isLive, withContentDefaults } from './edition.js'
import { STATIC_SITE } from '../content/index.js'

// Edition content comes from the files in src/content unless VITE_CONTENT_SOURCE=supabase.
// The visual editor (/admin preview) always works on database content.
export const STATIC = import.meta.env.VITE_CONTENT_SOURCE !== 'supabase' && !isCms

export const DEFAULT_BRAND = {
  wordmark: 'G Developments', headerTag1: 'Quarterly Journal',
  footerNote1: 'Quarterly Journal / Issue {issue}', footerNote2: 'For internal viewing only',
  copyright: '© 2027 G Developments', logoUrl: '', emailLabel: 'Email invitation',
  photoCaption: 'G Developments Quarterly Journal / Editorial imagery',
}

// Lists editions. A database that hasn't been updated with supabase/schema.sql yet has no
// publish_at column (Postgres error 42703); fall back so the site still works, just without scheduling.
export async function listQuarters(cols = 'id,slug,label,title,issue_no,sort,is_published') {
  const res = await supabase.from('quarters').select(`${cols},publish_at`).order('sort', { ascending: false })
  if (res.error?.code !== '42703') return res
  console.warn('quarters.publish_at is missing: re-run supabase/schema.sql to enable scheduled publishing.')
  return supabase.from('quarters').select(cols).order('sort', { ascending: false })
}

const SiteCtx = createContext(null)
export const useSite = () => useContext(SiteCtx)

// Loads global settings and the list of published quarters once.
// Inside the visual editor, the parent window streams a draft that overrides everything.
export function SiteProvider({ children }) {
  const [state, setState] = useState(() => (STATIC
    ? { loading: false, error: '', brand: { ...DEFAULT_BRAND, ...STATIC_SITE.brand }, design: { ...DEFAULT_DESIGN, ...STATIC_SITE.design }, quarters: STATIC_SITE.editions }
    : { loading: true, error: '', brand: DEFAULT_BRAND, design: DEFAULT_DESIGN, quarters: [] }))
  const [draft, setDraft] = useState(null)

  const load = useCallback(async () => {
    if (STATIC) {
      const design = { ...DEFAULT_DESIGN, ...STATIC_SITE.design }
      applyTheme(design)
      setState({ loading: false, error: '', brand: { ...DEFAULT_BRAND, ...STATIC_SITE.brand }, design, quarters: STATIC_SITE.editions })
      return
    }
    try {
      const [st, qs] = await Promise.all([supabase.from('site_settings').select('key,value'), listQuarters()])
      if (st.error || qs.error) throw st.error || qs.error
      const get = (k, d) => ({ ...d, ...(st.data.find((s) => s.key === k)?.value || {}) })
      const design = get('design', DEFAULT_DESIGN)
      applyTheme(design)
      setState({ loading: false, error: '', brand: get('brand', DEFAULT_BRAND), design, quarters: qs.data })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: errorText(e) }))
    }
  }, [])
  useEffect(() => { load() }, [load])
  const retry = () => { setState((s) => ({ ...s, loading: true, error: '' })); load() }

  useEffect(() => {
    if (!isCms) return
    const on = (e) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return
      if (e.data?.type === 'cms:state') setDraft(e.data.state)
    }
    window.addEventListener('message', on)
    window.parent.postMessage({ type: 'cms:ready' }, window.location.origin)
    return () => window.removeEventListener('message', on)
  }, [])

  useEffect(() => { if (draft?.design) applyTheme(draft.design) }, [draft?.design])

  const value = { ...state, draft, reload: load, retry }
  if (draft) { value.brand = { ...state.brand, ...draft.brand }; value.design = draft.design }
  return <SiteCtx.Provider value={value}>{children}</SiteCtx.Provider>
}

// Fills {issue}/{label}/{title} in the brand text for the edition being shown.
export function EditionScope({ quarter, children }) {
  const site = useSite()
  const value = useMemo(() => ({ ...site, brand: fillDeep(site.brand, editionVars(quarter)) }), [site, quarter])
  return <SiteCtx.Provider value={value}>{children}</SiteCtx.Provider>
}

// Editions already fetched this visit, so moving between the home page and section pages
// renders instantly (no loading flash, and #anchor scrolling lands on the final layout).
const editionCache = new Map()
const findTarget = (quarters, slug) => (slug ? quarters.find((q) => q.slug === slug) : quarters.find((q) => isLive(q)))

// Fetches one quarter with its sections (or the editor's draft when previewing), with placeholders filled.
export function useQuarterData(slug) {
  const { quarters, loading: siteLoading, error: siteError, draft } = useSite()
  const [data, setData] = useState(() => {
    const target = !siteLoading && findTarget(quarters, slug)
    if (STATIC && target) return { loading: false, error: '', quarter: target, sections: target.sections }
    const hit = target && editionCache.get(target.id)
    return hit ? { loading: false, error: '', ...hit } : { loading: true, error: '', quarter: null, sections: [] }
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (isCms || siteLoading || siteError) return
    const target = findTarget(quarters, slug)
    if (!target) return setData({ loading: false, error: '', quarter: null, sections: [] })
    if (STATIC) return setData({ loading: false, error: '', quarter: target, sections: target.sections })
    let live = true
    const hit = editionCache.get(target.id)
    setData((d) => (hit ? { loading: false, error: '', ...hit } : { ...d, loading: d.quarter?.id !== target.id, error: '' }))
    Promise.all([
      supabase.from('quarters').select('*').eq('id', target.id).single(),
      supabase.from('sections').select('*').eq('quarter_id', target.id).order('position'),
    ])
      .then(([q, s]) => {
        if (q.error || s.error) throw q.error || s.error
        const fresh = { quarter: q.data, sections: s.data }
        editionCache.set(target.id, fresh)
        if (live) setData({ loading: false, error: '', ...fresh })
      })
      .catch((e) => live && setData((d) => ({ ...d, loading: false, error: errorText(e) })))
    return () => { live = false }
  }, [slug, siteLoading, siteError, quarters, attempt])

  const raw = isCms
    ? (draft ? { loading: false, error: '', quarter: draft.quarter, sections: draft.sections } : { loading: true, error: '', quarter: null, sections: [] })
    : data
  const filled = useMemo(() => {
    if (!raw.quarter) return raw
    const content = withContentDefaults(raw.quarter.content)
    const vars = editionVars({ ...raw.quarter, content })
    return { ...raw, quarter: { ...raw.quarter, content: fillDeep(content, vars) }, sections: fillDeep(raw.sections, vars) }
  }, [raw.quarter, raw.sections, raw.loading, raw.error])
  return { ...filled, retry: () => setAttempt((n) => n + 1) }
}
