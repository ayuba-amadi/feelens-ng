import { Link, Outlet, Route, Routes } from 'react-router-dom';
import { ArrowRight, ClipboardList, ShieldCheck } from 'lucide-react';

function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="text-lg font-bold tracking-tight text-ink">
            FeeLens <span className="text-leaf">NG</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link to="/services" className="hover:text-ink">Services</Link>
            <Link to="/admin" className="hover:text-ink">Admin</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-slate-500 sm:px-6">
        Independent civic-tech transparency platform. Not a government platform.
      </footer>
    </div>
  );
}

function HomePage() {
  return (
    <section className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-leaf">Phase 1 foundation</p>
        <h1 className="max-w-xl text-3xl font-bold leading-tight text-ink sm:text-4xl">
          Check the official fee before you pay.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          FeeLens will help people find services, understand their verification status, and continue through the official channel.
        </p>
        <Link to="/services" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
          Explore services <ArrowRight size={16} />
        </Link>
      </div>
      <div className="grid gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <ClipboardList className="text-leaf" size={22} />
          <h2 className="mt-3 font-semibold text-ink">Evidence-led</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Every future fee record will carry its source and verification status.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShieldCheck className="text-leaf" size={22} />
          <h2 className="mt-3 font-semibold text-ink">Independent</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">FeeLens is not a government portal, agent, or payment processor.</p>
        </div>
      </div>
    </section>
  );
}

function ServicesPage() {
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-leaf">Public services</p>
      <h1 className="mt-2 text-2xl font-bold text-ink">Service directory placeholder</h1>
      <p className="mt-3 max-w-2xl text-slate-600">The public service directory and evidence views will be added in a later phase.</p>
    </section>
  );
}

function ServiceDetailPage() {
  return <PlaceholderPage title="Service detail placeholder" description="Verified service details, fee options, requirements, and official channels will appear here later." />;
}

function AdminPage() {
  return <PlaceholderPage title="Admin interface placeholder" description="The protected management interface will be added after the authentication foundation is reviewed." />;
}

function PlaceholderPage({ title, description }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-3 text-slate-600">{description}</p>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:slug" element={<ServiceDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<PlaceholderPage title="Page not found" description="This placeholder route does not exist." />} />
      </Route>
    </Routes>
  );
}

