// Static site content: brand, design and every edition, newest first.
// Used unless VITE_CONTENT_SOURCE=supabase (see src/lib/site.jsx). To add an edition, create
// src/content/<slug>.js like q1-2027.js and add it at the top of `editions`.
import q1_2027 from './q1-2027.js'

const pad2 = (n) => String(n).padStart(2, '0')
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']

// Sections marked `hidden: true` are left out (their content isn't ready; see CONTENT-STATUS.md).
// Visible sections are numbered 01, 02, ... in order, and anything on the home page that points
// at a hidden section is dropped too.
function publishable(edition) {
  const sections = edition.sections.filter((s) => !s.hidden).map((s, i) => ({ ...s, n: pad2(i + 1), position: i + 1 }))
  const shown = new Set(sections.map((s) => s.slug))
  const c = edition.content
  const challenge = sections.find((s) => s.slug === c.challenge?.slug)
  return {
    ...edition,
    sections,
    content: {
      ...c,
      directory: c.directory && { ...c.directory, title: c.directory.title.replace('{count}', WORDS[sections.length] || sections.length) },
      glance: c.glance &&{ ...c.glance, items: c.glance.items.filter((x) => !x.slug || shown.has(x.slug)) },
      stories: c.stories && { ...c.stories, cards: c.stories.cards.filter((x) => shown.has(x.slug)) },
      ai: c.ai && (shown.has(c.ai.moreSlug) ? c.ai : { ...c.ai, moreSlug: '' }),
      challenge: c.challenge && (challenge ? { ...c.challenge, number: challenge.n } : undefined),
    },
  }
}

export const STATIC_SITE = {
  brand: {
    wordmark: 'G Developments',
    headerTag1: 'Quarterly Journal',
    footerNote1: 'Quarterly Journal / Issue {issue}',
    footerNote2: 'For internal viewing only',
    copyright: '© 2027 G Developments',
    logoUrl: '',
  },
  design: {},
  editions: [q1_2027].map(publishable),
}
