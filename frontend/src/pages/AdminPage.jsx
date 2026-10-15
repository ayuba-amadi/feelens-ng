import { Link } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { PageIntro } from '../components/common/PageIntro';

export function AdminPage() {
  return <div className="page-shell py-8 sm:py-10"><div className="surface-card mx-auto max-w-xl p-6 text-center sm:p-8"><LockKeyhole className="mx-auto text-leaf" size={28} aria-hidden="true" /><PageIntro eyebrow="Administrator area" title="Protected management space" description="The management interface is not part of the public frontend phase. Administrator access will use the Phase 1 server-side session architecture." /><Link className="secondary-button mt-5" to="/">Return to public site</Link></div></div>;
}

