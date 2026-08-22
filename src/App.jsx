import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router'
import AppLayout from './components/layout/AppLayout'
import AboutPage from './pages/AboutPage'
import AgencyDetailPage from './pages/AgencyDetailPage'
import AgenciesPage from './pages/AgenciesPage'
import DataSourcesPage from './pages/DataSourcesPage'
import HomePage from './pages/HomePage'
import MethodologyPage from './pages/MethodologyPage'
import NotFoundPage from './pages/NotFoundPage'
import PrivacyPage from './pages/PrivacyPage'
import ServiceDetailPage from './pages/ServiceDetailPage'
import { agencies } from './data/agencies.js'
import { getMdaCatalog } from './data/mdaCatalog.js'

function LegacyAgencyRedirect() {
  const { slug } = useParams()
  const agency = agencies.find((candidate) => candidate.slug === slug)
  const mda = getMdaCatalog().find((candidate) => candidate.existingAgencyId === agency?.id)
  return <Navigate to={mda ? `/mdas/${mda.slug}` : '/mdas'} replace />
}

function App() {
  return <BrowserRouter><AppLayout><Routes><Route path="/" element={<HomePage />} /><Route path="/services" element={<Navigate to="/mdas" replace />} /><Route path="/services/:slug" element={<ServiceDetailPage />} /><Route path="/mdas" element={<AgenciesPage />} /><Route path="/mdas/:slug" element={<AgencyDetailPage />} /><Route path="/agencies" element={<Navigate to="/mdas" replace />} /><Route path="/agencies/:slug" element={<LegacyAgencyRedirect />} /><Route path="/methodology" element={<MethodologyPage />} /><Route path="/data-sources" element={<DataSourcesPage />} /><Route path="/about" element={<AboutPage />} /><Route path="/privacy" element={<PrivacyPage />} /><Route path="*" element={<NotFoundPage />} /></Routes></AppLayout></BrowserRouter>
}

export default App
