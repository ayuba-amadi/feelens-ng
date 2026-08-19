import { BrowserRouter, Route, Routes } from 'react-router'
import AppLayout from './components/layout/AppLayout'
import AboutPage from './pages/AboutPage'
import AgencyDetailPage from './pages/AgencyDetailPage'
import AgenciesPage from './pages/AgenciesPage'
import BrowseServicesPage from './pages/BrowseServicesPage'
import DataSourcesPage from './pages/DataSourcesPage'
import HomePage from './pages/HomePage'
import MethodologyPage from './pages/MethodologyPage'
import NotFoundPage from './pages/NotFoundPage'
import PrivacyPage from './pages/PrivacyPage'
import ServiceDetailPage from './pages/ServiceDetailPage'

function App() {
  return <BrowserRouter><AppLayout><Routes><Route path="/" element={<HomePage />} /><Route path="/services" element={<BrowseServicesPage />} /><Route path="/services/:slug" element={<ServiceDetailPage />} /><Route path="/agencies" element={<AgenciesPage />} /><Route path="/agencies/:slug" element={<AgencyDetailPage />} /><Route path="/methodology" element={<MethodologyPage />} /><Route path="/data-sources" element={<DataSourcesPage />} /><Route path="/about" element={<AboutPage />} /><Route path="/privacy" element={<PrivacyPage />} /><Route path="*" element={<NotFoundPage />} /></Routes></AppLayout></BrowserRouter>
}

export default App
