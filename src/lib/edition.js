// Placeholders editors can type in any text field; they are replaced with the edition's own values,
// so copied editions never carry a stale "Issue 01".
export const PLACEHOLDERS = ['{issue}', '{label}', '{title}', '{stories}']

export const pad2 = (n) => String(n ?? '').padStart(2, '0')

// Number of highlighted stories: the featured story plus each card.
const storyCount = (content) => (content?.stories?.feature ? 1 : 0) + (content?.stories?.cards?.length || 0)

export const editionVars = (q) => ({
  issue: pad2(q?.issue_no ?? ''),
  label: q?.label ?? '',
  title: q?.title ?? '',
  stories: pad2(storyCount(q?.content)),
})

// An edition is public when published, or once its scheduled time has passed.
export const isLive = (q, now = new Date()) => !!q && (q.is_published || (!!q.publish_at && new Date(q.publish_at) <= now))
export const isScheduled = (q, now = new Date()) => !!q && !q.is_published && !!q.publish_at && new Date(q.publish_at) > now

export const fill = (text, vars) =>
  typeof text === 'string' ? text.replace(/\{(issue|label|title|stories)\}/g, (_, k) => vars[k]) : text

// Fills every string in a JSON value, leaving links and image URLs alone.
export const fillDeep = (v, vars) => {
  if (Array.isArray(v)) return v.map((x) => fillDeep(x, vars))
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'slug' || /url$/i.test(k) ? x : fillDeep(x, vars)]))
  return fill(v, vars)
}

// Story cards used to take their photos from fixed slots (images.walkway / people / blocks).
const LEGACY_CARD_IMAGES = ['walkway', 'people', 'blocks']

// Adds fields introduced after an edition was created, so they show up (and can be edited) in the CMS.
// Existing values are never overwritten.
export function withContentDefaults(content) {
  const c = content || {}
  const cards = (c.stories?.cards || []).map((card, i) => ({
    ...card,
    desc: card.desc ?? '',
    imageUrl: card.imageUrl ?? c.images?.[LEGACY_CARD_IMAGES[i]] ?? '',
    imageAlt: card.imageAlt ?? c.imageAlts?.[LEGACY_CARD_IMAGES[i]] ?? '',
  }))
  return {
    ...c,
    hero: { topLeft: 'G / {issue}', topRight: 'Inside the quarter', ...c.hero },
    ...(c.stories ? { stories: { ...c.stories, cards } } : {}),
    archive: { cardLabel: 'Past edition', ...c.archive },
  }
}
