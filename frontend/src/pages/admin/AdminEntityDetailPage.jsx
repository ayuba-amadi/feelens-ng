import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminError, AdminLoading, AdminPageHeader } from '../../components/admin/AdminUi';
import { adminApi } from '../../lib/admin-api';
import { formatDate } from '../../lib/format';

const labels = {
  mdas: 'MDA', services: 'Service', fees: 'Fee option', sources: 'Source',
};

const hidden = new Set(['id', 'sources', 'requirements', 'processSteps']);

function displayValue(key, value) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key.endsWith('At') || key.endsWith('Date')) return formatDate(value);
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value).replaceAll('_', ' ');
}

export function AdminEntityDetailPage({ type }) {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, record: null, error: '' });
  useEffect(() => {
    let active = true;
    adminApi[type].get(id).then((record) => active && setState({ loading: false, record, error: '' }))
      .catch((error) => active && setState({ loading: false, record: null, error: error.message }));
    return () => { active = false; };
  }, [type, id]);

  if (state.loading) return <AdminLoading />;
  if (state.error) return <AdminError message={state.error} />;
  const record = state.record;
  const title = record.name || record.title || record.label || `${labels[type]} #${record.id}`;
  return (
    <div>
      <AdminPageHeader title={title} description={`${labels[type]} record #${record.id}`} backTo={`/admin/${type}`} />
      <div className="mb-4 flex flex-wrap gap-2"><Link to={`/admin/${type}/${id}/edit`} className="primary-button">Edit {labels[type].toLowerCase()}</Link></div>
      <section className="admin-panel p-4 sm:p-5">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(record).filter(([key]) => !hidden.has(key)).map(([key, value]) => (
            <div key={key} className="min-w-0 border-b border-slate-100 pb-3">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold capitalize text-slate-800">{displayValue(key, value)}</dd>
            </div>
          ))}
        </dl>
      </section>
      {(record.requirements?.length || record.processSteps?.length) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {record.requirements?.length > 0 && <section className="admin-panel p-4"><h2 className="font-extrabold text-navy">Requirements</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">{record.requirements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
          {record.processSteps?.length > 0 && <section className="admin-panel p-4"><h2 className="font-extrabold text-navy">Process steps</h2><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">{record.processSteps.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol></section>}
        </div>
      )}
      {type === 'fees' && <FeeEvidence record={record} />}
    </div>
  );
}

function FeeEvidence({ record }) {
  return (
    <section className="admin-panel mt-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-extrabold text-navy">Attached evidence</h2><p className="text-sm text-slate-500">Manage evidence relationships in the fee editor.</p></div>
        <Link to={`/admin/fees/${record.id}/edit#evidence`} className="secondary-button">Manage evidence</Link>
      </div>
      {!record.sources?.length ? <p className="mt-4 text-sm text-slate-600">No source is attached to this fee yet.</p> : (
        <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {record.sources.map((source) => <li key={source.id} className="p-3 text-sm"><span className="font-bold text-navy">{source.title}</span><span className="ml-2 capitalize text-slate-500">{source.sourceType?.replaceAll('_', ' ')}</span></li>)}
        </ul>
      )}
    </section>
  );
}
