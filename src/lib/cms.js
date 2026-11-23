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
export function installCmsClient() {
  document.documentElement.classList.add('cms-mode')
  const style = document.createElement('style')
  document.head.appendChild(style)

  document.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation()
    const el = e.target.closest?.('[data-cms]')
    if (el) window.parent.postMessage({ type: 'cms:select', path: el.getAttribute('data-cms') }, '*')
  }, true)

  window.addEventListener('message', (e) => {
    if (e.data?.type !== 'cms:selected') return
    const p = String(e.data.path || '').replace(/"/g, '')
    style.textContent = p ? `[data-cms="${p}"]{outline:2px solid #2271b1!important;outline-offset:3px!important}` : ''
  })
}
