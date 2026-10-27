import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/admin/AdminLayout';
import { ProtectedAdminRoute } from './components/admin/ProtectedAdminRoute';
import { SiteLayout } from './components/layout/SiteLayout';
import { AdminAuthProvider } from './context/AdminAuthContext';
const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })));
const DataSourcesPage = lazy(() => import('./pages/DataSourcesPage').then((module) => ({ default: module.DataSourcesPage })));
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const MdaDetailPage = lazy(() => import('./pages/MdaDetailPage').then((module) => ({ default: module.MdaDetailPage })));
const MdasPage = lazy(() => import('./pages/MdasPage').then((module) => ({ default: module.MdasPage })));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage').then((module) => ({ default: module.MethodologyPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })));
const PolicyPage = lazy(() => import('./pages/PolicyPage').then((module) => ({ default: module.PolicyPage })));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage').then((module) => ({ default: module.ServiceDetailPage })));
const AdminAccountPage = lazy(() => import('./pages/admin/AdminAccountPage').then((module) => ({ default: module.AdminAccountPage })));
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AdminAuditLogsPage').then((module) => ({ default: module.AdminAuditLogsPage })));
const AdminChannelsPage = lazy(() => import('./pages/admin/AdminChannelsPage').then((module) => ({ default: module.AdminChannelsPage })));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const AdminEntityDetailPage = lazy(() => import('./pages/admin/AdminEntityDetailPage').then((module) => ({ default: module.AdminEntityDetailPage })));
const AdminEntityFormPage = lazy(() => import('./pages/admin/AdminEntityFormPage').then((module) => ({ default: module.AdminEntityFormPage })));
const AdminEntityListPage = lazy(() => import('./pages/admin/AdminEntityListPage').then((module) => ({ default: module.AdminEntityListPage })));
const AdminFoiPage = lazy(() => import('./pages/admin/AdminFoiPage').then((module) => ({ default: module.AdminFoiPage })));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));
const AdminVerificationsPage = lazy(() => import('./pages/admin/AdminVerificationsPage').then((module) => ({ default: module.AdminVerificationsPage })));

export default function App() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<div role="status" className="page-shell py-8">Loading page…</div>}><Routes>
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
      </Routes></Suspense>
    </AdminAuthProvider>
  );
}

