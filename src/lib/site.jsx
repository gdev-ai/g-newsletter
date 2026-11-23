import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { applyTheme, DEFAULT_DESIGN } from './theme.js'
import { isCms } from './cms.js'

export const DEFAULT_BRAND = {
  wordmark: 'G Developments', headerTag1: 'Quarterly Journal',
  footerNote1: 'Quarterly Journal / Issue 01', footerNote2: 'For internal viewing only',
  copyright: '© 2027 G Developments', logoUrl: '',
}

const SiteCtx = createContext(null)
export const useSite = () => useContext(SiteCtx)

// Loads global settings and the list of published quarters once.
// Inside the visual editor, the parent window streams a draft that overrides everything.
export function SiteProvider({ children }) {
  const [state, setState] = useState({ loading: true, brand: DEFAULT_BRAND, design: DEFAULT_DESIGN, quarters: [] })
  const [draft, setDraft] = useState(null)

  const load = async () => {
    const [{ data: settings }, { data: quarters }] = await Promise.all([
      supabase.from('site_settings').select('key,value'),
      supabase.from('quarters').select('id,slug,label,title,issue_no,sort,is_published').order('sort', { ascending: false }),
    ])
    const get = (k, d) => ({ ...d, ...(settings?.find((s) => s.key === k)?.value || {}) })
    const design = get('design', DEFAULT_DESIGN)
    applyTheme(design)
    setState({ loading: false, brand: get('brand', DEFAULT_BRAND), design, quarters: quarters || [] })
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!isCms) return
    const on = (e) => { if (e.data?.type === 'cms:state') setDraft(e.data.state) }
    window.addEventListener('message', on)
    window.parent.postMessage({ type: 'cms:ready' }, '*')
    return () => window.removeEventListener('message', on)
  }, [])

  useEffect(() => { if (draft?.design) applyTheme(draft.design) }, [draft?.design])

  const value = { ...state, draft, reload: load }
  if (draft) { value.brand = { ...state.brand, ...draft.brand }; value.design = draft.design }
  return <SiteCtx.Provider value={value}>{children}</SiteCtx.Provider>
}

// Fetches one quarter with its sections (or the editor's draft when previewing).
export function useQuarterData(slug) {
  const { quarters, loading: siteLoading, draft } = useSite()
  const [data, setData] = useState({ loading: true, quarter: null, sections: [] })

  useEffect(() => {
    if (isCms || siteLoading) return
    const published = quarters.filter((q) => q.is_published)
    const target = slug ? quarters.find((q) => q.slug === slug) : published[0]
    if (!target) return setData({ loading: false, quarter: null, sections: [] })
    let live = true
    setData((d) => ({ ...d, loading: true }))
    Promise.all([
      supabase.from('quarters').select('*').eq('id', target.id).single(),
      supabase.from('sections').select('*').eq('quarter_id', target.id).order('position'),
    ]).then(([q, s]) => live && setData({ loading: false, quarter: q.data, sections: s.data || [] }))
    return () => { live = false }
  }, [slug, siteLoading, quarters])

  if (isCms) return draft ? { loading: false, quarter: draft.quarter, sections: draft.sections } : { loading: true, quarter: null, sections: [] }
  return data
}
