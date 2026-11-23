import { rename } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Link-preview tags in index.html need absolute URLs, so the site's public address
// (VITE_SITE_URL, e.g. https://journal.example.com) is written into them at build time.
function siteUrl(url) {
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', url),
    buildStart() {
      if (!url) this.warn('VITE_SITE_URL is not set: link previews will use relative image URLs, which Slack, WhatsApp and LinkedIn ignore.')
    },
  }
}

// On Vercel, the built page is served through api/share.js (per-page link previews). Vercel serves a real
// file before applying rewrites, so dist/index.html is renamed to let "/" reach the function too.
function vercelShell() {
  let outDir = 'dist'
  return {
    name: 'vercel-shell',
    apply: 'build',
    configResolved: (c) => { outDir = c.build.outDir },
    async closeBundle() {
      if (process.env.VERCEL) await rename(join(outDir, 'index.html'), join(outDir, 'app.html'))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  return { plugins: [react(), siteUrl((env.VITE_SITE_URL || '').replace(/\/+$/, '')), vercelShell()] }
})
