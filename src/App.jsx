import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Journal from './Journal.jsx'
import Section from './Section.jsx'
import Admin from './admin/Admin.jsx'
import { ScrollManager } from './Chrome.jsx'
import { SiteProvider, useQuarterData } from './lib/site.jsx'

function QuarterPage({ page: Page }) {
  const { q } = useParams()
  const { loading, quarter, sections } = useQuarterData(q)
  if (loading) return <div className="min-h-screen bg-ink" />
  if (!quarter) return <div className="grid min-h-screen place-items-center bg-ink text-[11px] uppercase tracking-label text-white/60">Edition not found</div>
  return <Page quarter={quarter} sections={sections} base={`/q/${quarter.slug}`} />
}

export default function App() {
  return (
    <SiteProvider>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<QuarterPage page={Journal} />} />
        <Route path="/q/:q" element={<QuarterPage page={Journal} />} />
        <Route path="/q/:q/section/:slug" element={<QuarterPage page={Section} />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SiteProvider>
  )
}
