import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Journal from './Journal.jsx'
import Section from './Section.jsx'
import Admin from './admin/Admin.jsx'
import { ScrollManager } from './Chrome.jsx'
import { StatusScreen } from './shared.jsx'
import { EditionScope, SiteProvider, useQuarterData, useSite } from './lib/site.jsx'

function QuarterPage({ page: Page }) {
  const { q } = useParams()
  const site = useSite()
  const { loading, error, quarter, sections, retry } = useQuarterData(q)
  if (site.error) return <StatusScreen title="The journal could not be loaded" detail={site.error} onRetry={site.retry} />
  if (error) return <StatusScreen title="This edition could not be loaded" detail={error} onRetry={retry} />
  if (site.loading || loading) return <StatusScreen title="Loading" busy />
  if (!quarter) return <StatusScreen title="Edition not found" />
  return (
    <EditionScope quarter={quarter}>
      <Page quarter={quarter} sections={sections} base={`/q/${quarter.slug}`} />
    </EditionScope>
  )
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
