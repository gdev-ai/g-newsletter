// Live-preview bridge between the visual editor (parent window) and the site (iframe).
export const isCms = typeof window !== 'undefined'
  && window.parent !== window
  && new URLSearchParams(window.location.search).has('cms')

export const cms = (path) => ({ 'data-cms': path })

export const getIn = (obj, keys) => keys.reduce((o, k) => (o == null ? o : o[k]), obj)

export function setIn(obj, keys, value) {
  if (!keys.length) return value
  const [k, ...rest] = keys
  const copy = Array.isArray(obj) ? [...obj] : { ...obj }
  copy[k] = setIn(obj?.[k], rest, value)
  return copy
}

// Runs inside the preview iframe: highlights editable items and reports clicks.
// The editor and preview are always same-origin, so messages from anywhere else are ignored.
export function installCmsClient() {
  const origin = window.location.origin
  document.documentElement.classList.add('cms-mode')
  const style = document.createElement('style')
  document.head.appendChild(style)

  document.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation()
    const el = e.target.closest?.('[data-cms]')
    if (el) window.parent.postMessage({ type: 'cms:select', path: el.getAttribute('data-cms') }, origin)
  }, true)

  // After a click in the preview, keyboard focus is inside this frame; hand the editor's
  // shortcuts (save, undo, redo) to the parent so they keep working.
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return
    const key = e.key.toLowerCase()
    if (!['s', 'z', 'y'].includes(key)) return
    e.preventDefault()
    window.parent.postMessage({ type: 'cms:key', key, shift: e.shiftKey }, origin)
  }, true)

  let last = ''
  window.addEventListener('message', (e) => {
    if (e.origin !== origin || e.source !== window.parent || e.data?.type !== 'cms:selected') return
    const p = String(e.data.path || '').replace(/["\\]/g, '')
    style.textContent = p ? `[data-cms="${p}"]{outline:2px solid #2271b1!important;outline-offset:3px!important}` : ''
    // Bring a newly selected item into view (e.g. a grid block picked in the sidebar).
    if (p && p !== last) document.querySelector(`[data-cms="${p}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    last = p
  })
}
