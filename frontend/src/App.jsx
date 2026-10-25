import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/admin/AdminLayout';
import { ProtectedAdminRoute } from './components/admin/ProtectedAdminRoute';
import { SiteLayout } from './components/layout/SiteLayout';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AboutPage } from './pages/AboutPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { HomePage } from './pages/HomePage';
import { MdaDetailPage } from './pages/MdaDetailPage';
import { MdasPage } from './pages/MdasPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { PolicyPage } from './pages/PolicyPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { AdminAccountPage } from './pages/admin/AdminAccountPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminChannelsPage } from './pages/admin/AdminChannelsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminEntityDetailPage } from './pages/admin/AdminEntityDetailPage';
import { AdminEntityFormPage } from './pages/admin/AdminEntityFormPage';
import { AdminEntityListPage } from './pages/admin/AdminEntityListPage';
import { AdminFoiPage } from './pages/admin/AdminFoiPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminVerificationsPage } from './pages/admin/AdminVerificationsPage';

export default function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<ProtectedAdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            {['mdas', 'services', 'fees', 'sources'].map((type) => (
              <Route key={type}>
                <Route path={`/admin/${type}`} element={<AdminEntityListPage type={type} />} />
                <Route path={`/admin/${type}/new`} element={<AdminEntityFormPage type={type} />} />
                <Route path={`/admin/${type}/:id`} element={<AdminEntityDetailPage type={type} />} />
                <Route path={`/admin/${type}/:id/edit`} element={<AdminEntityFormPage type={type} />} />
              </Route>
            ))}
            <Route path="/admin/channels" element={<AdminChannelsPage />} />
            <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
            <Route path="/admin/foi" element={<AdminFoiPage />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/account" element={<AdminAccountPage />} />
          </Route>
        </Route>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/mdas" element={<MdasPage />} />
          <Route path="/mdas/:slug" element={<MdaDetailPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/policy" element={<PolicyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}

