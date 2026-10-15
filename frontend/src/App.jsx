import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/layout/SiteLayout';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { HomePage } from './pages/HomePage';
import { MdaDetailPage } from './pages/MdaDetailPage';
import { MdasPage } from './pages/MdasPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/mdas" element={<MdasPage />} />
        <Route path="/mdas/:slug" element={<MdaDetailPage />} />
        <Route path="/services/:slug" element={<ServiceDetailPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/data-sources" element={<DataSourcesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

