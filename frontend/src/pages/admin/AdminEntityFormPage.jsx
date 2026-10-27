import { ArrowDown, ArrowUp, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminError, AdminLoading, AdminPageHeader, Field, FormSection, InlineNotice } from '../../components/admin/AdminUi';
import { adminApi } from '../../lib/admin-api';

const verificationStatuses = ['verified', 'pending', 'conflicting', 'unable_to_verify', 'superseded'];
const coverageStatuses = ['pilot', 'roadmap', 'inactive'];
const pricingModels = ['fixed', 'free', 'range', 'percentage', 'formula', 'variable', 'unknown'];
const sourceTypes = ['act', 'regulation', 'gazette', 'statutory_instrument', 'approved_fee_schedule', 'official_circular', 'official_website', 'official_portal', 'official_notice', 'official_faq', 'official_fee_page', 'official_process_page', 'service_level_agreement', 'gazette_fee_schedule', 'official_statement', 'official_bulletin', 'official_training_material', 'official_guideline', 'official_tariff_page', 'correspondence', 'foi_response', 'other'];

const defaults = {
  mdas: { name: '', slug: '', acronym: '', description: '', websiteUrl: '', entityType: '', jurisdiction: '', category: '', coverageStatus: 'pilot', isActive: true },
  services: { mdaId: '', name: '', slug: '', description: '', category: '', jurisdiction: '', requirements: [], processSteps: [], notes: '', isActive: true },
  fees: { serviceId: '', pricingModel: 'unknown', label: '', currency: 'NGN', amount: '', minimumAmount: '', maximumAmount: '', percentage: '', formula: '', conditions: '', notes: '', verificationStatus: 'pending', verifiedAt: '', nextReviewAt: '', isCurrent: true },
  sources: { title: '', sourceType: 'official_website', evidenceTier: 2, publisher: '', url: '', documentReference: '', publicationDate: '', effectiveDate: '', accessedAt: '', notes: '' },
};

const titles = { mdas: 'MDA', services: 'service', fees: 'fee option', sources: 'source' };

function Input({ ...props }) { return <input {...props} className={`admin-input ${props.className || ''}`} />; }
function Select({ children, ...props }) { return <select {...props} className="admin-input">{children}</select>; }
function Textarea({ ...props }) { return <textarea {...props} className="admin-input min-h-28 resize-y" />; }

function toInputDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

function normalizeRecord(type, record) {
  const value = { ...defaults[type], ...record };
  ['publicationDate', 'effectiveDate', 'accessedAt', 'verifiedAt', 'nextReviewAt'].forEach((key) => {
    if (key in value) value[key] = toInputDate(value[key]);
  });
  for (const key of ['amount', 'minimumAmount', 'maximumAmount', 'percentage']) {
    if (key in value && value[key] === null) value[key] = '';
  }
  return value;
}

function payloadFor(type, form) {
  const value = { ...form };
  if (type === 'fees') {
    ['amount', 'minimumAmount', 'maximumAmount', 'percentage'].forEach((key) => {
      value[key] = value[key] === '' ? null : Number(value[key]);
    });
    if (!value.currency) value.currency = 'NGN';
    if (value.pricingModel !== 'fixed') value.amount = null;
    if (value.pricingModel !== 'range') { value.minimumAmount = null; value.maximumAmount = null; }
    if (value.pricingModel !== 'percentage') value.percentage = null;
    if (value.pricingModel !== 'formula') value.formula = null;
    if (value.pricingModel !== 'variable') value.conditions = value.conditions || null;
  }
  if (['services', 'fees'].includes(type)) value[`${type === 'services' ? 'mda' : 'service'}Id`] = Number(value[`${type === 'services' ? 'mda' : 'service'}Id`]);
  if (type === 'sources') value.evidenceTier = Number(value.evidenceTier);
  return value;
}

function useOptions(resource) {
  const [state, setState] = useState({ items: [], error: '' });
  useEffect(() => {
    adminApi[resource].list({ pageSize: 100 }).then((data) => setState({ items: data.items || [], error: '' }))
      .catch((error) => setState({ items: [], error: error.message }));
  }, [resource]);
  return state;
}

export function AdminEntityFormPage({ type }) {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(defaults[type]);
  const [initial, setInitial] = useState(JSON.stringify(defaults[type]));
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const dirty = useMemo(() => JSON.stringify(form) !== initial, [form, initial]);

  useEffect(() => {
    if (!editing) return;
    let active = true;
    adminApi[type].get(id).then((record) => {
      if (!active) return;
      const normalized = normalizeRecord(type, record);
      setForm(normalized);
      setInitial(JSON.stringify(normalized));
      setLoading(false);
    }).catch((requestError) => {
      if (active) { setError(requestError.message); setLoading(false); }
    });
    return () => { active = false; };
  }, [type, id, editing]);

  useEffect(() => {
    const warn = (event) => {
      if (!dirty || saving) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError(''); setFieldErrors({});
    try {
      const payload = payloadFor(type, form);
      const record = editing ? await adminApi[type].update(id, payload) : await adminApi[type].create(payload);
      setInitial(JSON.stringify(form));
      navigate(`/admin/${type}/${record.id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setFieldErrors(Object.fromEntries((requestError.details || []).map((item) => [item.field, item.message])));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setSaving(false); }
  }

  if (loading) return <AdminLoading label={`Loading ${titles[type]}…`} />;
  if (error && !form) return <AdminError message={error} />;

  return (
    <div>
      <AdminPageHeader title={`${editing ? 'Edit' : 'Add'} ${titles[type]}`} description="Required fields are marked. Changes are validated again by the server before they are stored." backTo={editing ? `/admin/${type}/${id}` : `/admin/${type}`} />
      {error && <div className="mb-4"><AdminError message={error} /></div>}
      <form onSubmit={submit} className="space-y-4">
        {type === 'mdas' && <MdaFields form={form} set={set} errors={fieldErrors} />}
        {type === 'services' && <ServiceFields form={form} set={set} errors={fieldErrors} />}
        {type === 'fees' && <FeeFields form={form} set={set} errors={fieldErrors} />}
        {type === 'sources' && <SourceFields form={form} set={set} errors={fieldErrors} />}
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <span className="text-xs font-semibold text-slate-500">{dirty ? 'Unsaved changes' : 'No unsaved changes'}</span>
          <div className="flex flex-wrap gap-2">
            <Link to={editing ? `/admin/${type}/${id}` : `/admin/${type}`} className="secondary-button">Cancel</Link>
            <button type="submit" disabled={saving} className="primary-button">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </form>
      {editing && type === 'fees' && <><EvidenceManager fee={form} /><FeeSupersessionPanel fee={form} /></>}
    </div>
  );
}

function MdaFields({ form, set, errors }) {
  return (
    <>
      <FormSection title="Identity" description="How this institution is identified publicly.">
        <div className="admin-form-grid">
          <Field label="Name" name="name" required error={errors.name}>{(props) => <Input {...props} value={form.name} onChange={(e) => set('name', e.target.value)} required />}</Field>
          <Field label="Slug" name="slug" required hint="Lowercase letters, numbers and hyphens only." error={errors.slug}>{(props) => <Input {...props} value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} required />}</Field>
          <Field label="Acronym" name="acronym" error={errors.acronym}>{(props) => <Input {...props} value={form.acronym || ''} onChange={(e) => set('acronym', e.target.value)} />}</Field>
          <Field label="Entity type" name="entityType" error={errors.entityType}>{(props) => <Input {...props} value={form.entityType || ''} onChange={(e) => set('entityType', e.target.value)} />}</Field>
          <Field label="Jurisdiction" name="jurisdiction" error={errors.jurisdiction}>{(props) => <Input {...props} value={form.jurisdiction || ''} onChange={(e) => set('jurisdiction', e.target.value)} />}</Field>
          <Field label="Category" name="category" error={errors.category}>{(props) => <Input {...props} value={form.category || ''} onChange={(e) => set('category', e.target.value)} />}</Field>
        </div>
        <div className="mt-4"><Field label="Description" name="description" error={errors.description}>{(props) => <Textarea {...props} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />}</Field></div>
      </FormSection>
      <FormSection title="Coverage and official presence">
        <div className="admin-form-grid">
          <Field label="Official website" name="websiteUrl" error={errors.websiteUrl}>{(props) => <Input {...props} type="url" value={form.websiteUrl || ''} onChange={(e) => set('websiteUrl', e.target.value)} />}</Field>
          <Field label="Publication status" name="coverageStatus" required error={errors.coverageStatus}>{(props) => <Select {...props} value={form.coverageStatus} onChange={(e) => set('coverageStatus', e.target.value)}>{coverageStatuses.map((status) => <option key={status} value={status}>{status === 'pilot' ? 'Published' : status === 'roadmap' ? 'Planned' : status.replaceAll('_', ' ')}</option>)}</Select>}</Field>
          <Field label="Record state" name="isActive">{(props) => <Select {...props} value={String(form.isActive)} onChange={(e) => set('isActive', e.target.value === 'true')}><option value="true">Active</option><option value="false">Inactive / archived</option></Select>}</Field>
        </div>
      </FormSection>
    </>
  );
}

function ServiceFields({ form, set, errors }) {
  const mdas = useOptions('mdas');
  return (
    <>
      <FormSection title="Service identity">
        {mdas.error && <InlineNotice tone="warning">MDA options could not be loaded: {mdas.error}</InlineNotice>}
        <div className="admin-form-grid mt-3">
          <Field label="Parent MDA" name="mdaId" required error={errors.mdaId}>{(props) => <Select {...props} value={form.mdaId} onChange={(e) => set('mdaId', e.target.value)} required><option value="">Select an MDA</option>{mdas.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>}</Field>
          <Field label="Service name" name="name" required error={errors.name}>{(props) => <Input {...props} value={form.name} onChange={(e) => set('name', e.target.value)} required />}</Field>
          <Field label="Slug" name="slug" required error={errors.slug}>{(props) => <Input {...props} value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} required />}</Field>
          <Field label="Category" name="category" error={errors.category}>{(props) => <Input {...props} value={form.category || ''} onChange={(e) => set('category', e.target.value)} />}</Field>
          <Field label="Jurisdiction" name="jurisdiction" error={errors.jurisdiction}>{(props) => <Input {...props} value={form.jurisdiction || ''} onChange={(e) => set('jurisdiction', e.target.value)} />}</Field>
          <Field label="Record state" name="isActive">{(props) => <Select {...props} value={String(form.isActive)} onChange={(e) => set('isActive', e.target.value === 'true')}><option value="true">Active</option><option value="false">Inactive</option></Select>}</Field>
        </div>
        <div className="mt-4"><Field label="Description" name="description" error={errors.description}>{(props) => <Textarea {...props} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />}</Field></div>
      </FormSection>
      <RepeatableList title="Requirements" values={form.requirements || []} onChange={(values) => set('requirements', values)} placeholder="Add a requirement" />
      <RepeatableList title="Process steps" values={form.processSteps || []} onChange={(values) => set('processSteps', values)} placeholder="Describe a step" ordered />
      <FormSection title="Internal research notes"><Field label="Notes" name="notes" hint="Internal notes are not part of the public service description." error={errors.notes}>{(props) => <Textarea {...props} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />}</Field></FormSection>
    </>
  );
}

function RepeatableList({ title, values, onChange, placeholder, ordered = false }) {
  const update = (index, value) => onChange(values.map((item, itemIndex) => itemIndex === index ? value : item));
  const remove = (index) => onChange(values.filter((_, itemIndex) => itemIndex !== index));
  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <FormSection title={title} description="Use one concise item per row; administrators do not need to edit JSON.">
      <div className="space-y-2">
        {values.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            {ordered && <span className="grid h-11 w-8 shrink-0 place-items-center text-sm font-bold text-slate-500">{index + 1}</span>}
            <input aria-label={`${title} item ${index + 1}`} value={item} onChange={(e) => update(index, e.target.value)} className="admin-input min-w-0 flex-1" required />
            {ordered && <div className="flex"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="admin-icon-button" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={() => move(index, 1)} disabled={index === values.length - 1} className="admin-icon-button" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button></div>}
            <button type="button" onClick={() => remove(index)} className="admin-icon-button text-red-700" aria-label={`Remove ${title.toLowerCase()} item`}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...values, ''])} className="secondary-button"><Plus className="h-4 w-4" /> {placeholder}</button>
      </div>
    </FormSection>
  );
}

function FeeFields({ form, set, errors }) {
  const services = useOptions('services');
  const model = form.pricingModel;
  return (
    <>
      <FormSection title="Fee identity and model">
        {services.error && <InlineNotice tone="warning">Service options could not be loaded: {services.error}</InlineNotice>}
        <div className="admin-form-grid mt-3">
          <Field label="Service" name="serviceId" required error={errors.serviceId}>{(props) => <Select {...props} value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)} required><option value="">Select a service</option>{services.items.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.mdaName}</option>)}</Select>}</Field>
          <Field label="Option label" name="label" error={errors.label}>{(props) => <Input {...props} value={form.label || ''} onChange={(e) => set('label', e.target.value)} />}</Field>
          <Field label="Pricing model" name="pricingModel" required error={errors.pricingModel}>{(props) => <Select {...props} value={model} onChange={(e) => set('pricingModel', e.target.value)}>{pricingModels.map((item) => <option key={item} value={item}>{item}</option>)}</Select>}</Field>
          <Field label="Verification status" name="verificationStatus" required error={errors.verificationStatus}>{(props) => <Select {...props} value={form.verificationStatus} onChange={(e) => set('verificationStatus', e.target.value)}>{verificationStatuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</Select>}</Field>
        </div>
        {model === 'unknown' && <div className="mt-4"><InlineNotice tone="warning">Unknown means an authoritative current amount has not been established. It is never stored or displayed as zero.</InlineNotice></div>}
        {model === 'free' && <div className="mt-4"><InlineNotice>No numeric amount is accepted for a free service.</InlineNotice></div>}
      </FormSection>
      <FormSection title="Pricing details" description="Only fields appropriate to the selected pricing model are shown.">
        <div className="admin-form-grid">
          {['fixed', 'range'].includes(model) && <Field label="Currency" name="currency" required error={errors.currency}>{(props) => <Input {...props} value={form.currency || ''} onChange={(e) => set('currency', e.target.value.toUpperCase())} maxLength="3" required />}</Field>}
          {model === 'fixed' && <Field label="Amount" name="amount" required error={errors.amount}>{(props) => <Input {...props} type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />}</Field>}
          {model === 'range' && <><Field label="Minimum amount" name="minimumAmount" required error={errors.minimumAmount}>{(props) => <Input {...props} type="number" min="0.01" step="0.01" value={form.minimumAmount} onChange={(e) => set('minimumAmount', e.target.value)} required />}</Field><Field label="Maximum amount" name="maximumAmount" required error={errors.maximumAmount}>{(props) => <Input {...props} type="number" min="0.01" step="0.01" value={form.maximumAmount} onChange={(e) => set('maximumAmount', e.target.value)} required />}</Field></>}
          {model === 'percentage' && <Field label="Percentage" name="percentage" required error={errors.percentage}>{(props) => <Input {...props} type="number" min="0.01" step="0.01" value={form.percentage} onChange={(e) => set('percentage', e.target.value)} required />}</Field>}
          {model === 'formula' && <Field label="Formula / calculation" name="formula" required error={errors.formula}>{(props) => <Textarea {...props} value={form.formula || ''} onChange={(e) => set('formula', e.target.value)} required />}</Field>}
          {model === 'variable' && <Field label="Conditions / explanation" name="conditions" required error={errors.conditions}>{(props) => <Textarea {...props} value={form.conditions || ''} onChange={(e) => set('conditions', e.target.value)} required />}</Field>}
        </div>
        {!['variable', 'unknown'].includes(model) && <div className="mt-4"><Field label="Conditions" name="conditions" error={errors.conditions}>{(props) => <Textarea {...props} value={form.conditions || ''} onChange={(e) => set('conditions', e.target.value)} />}</Field></div>}
      </FormSection>
      <FormSection title="Review state">
        <div className="admin-form-grid">
          <Field label="Verified date" name="verifiedAt" error={errors.verifiedAt}>{(props) => <Input {...props} type="date" value={form.verifiedAt || ''} onChange={(e) => set('verifiedAt', e.target.value)} />}</Field>
          <Field label="Next review date" name="nextReviewAt" error={errors.nextReviewAt}>{(props) => <Input {...props} type="date" value={form.nextReviewAt || ''} onChange={(e) => set('nextReviewAt', e.target.value)} />}</Field>
          <Field label="Record state" name="isCurrent">{(props) => <Select {...props} value={String(form.isCurrent)} onChange={(e) => set('isCurrent', e.target.value === 'true')}><option value="true">Current</option><option value="false">Historical</option></Select>}</Field>
        </div>
        <div className="mt-4"><Field label="Notes" name="notes" error={errors.notes}>{(props) => <Textarea {...props} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />}</Field></div>
      </FormSection>
    </>
  );
}

function SourceFields({ form, set, errors }) {
  return (
    <>
      <FormSection title="Source identity">
        <div className="admin-form-grid">
          <Field label="Title" name="title" required error={errors.title}>{(props) => <Input {...props} value={form.title} onChange={(e) => set('title', e.target.value)} required />}</Field>
          <Field label="Source type" name="sourceType" required error={errors.sourceType}>{(props) => <Select {...props} value={form.sourceType} onChange={(e) => set('sourceType', e.target.value)}>{sourceTypes.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</Select>}</Field>
          <Field label="Evidence tier" name="evidenceTier" required error={errors.evidenceTier}>{(props) => <Select {...props} value={form.evidenceTier} onChange={(e) => set('evidenceTier', e.target.value)}><option value="1">Tier 1</option><option value="2">Tier 2</option><option value="3">Tier 3</option></Select>}</Field>
          <Field label="Publisher" name="publisher" error={errors.publisher}>{(props) => <Input {...props} value={form.publisher || ''} onChange={(e) => set('publisher', e.target.value)} />}</Field>
          <Field label="Official URL" name="url" error={errors.url}>{(props) => <Input {...props} type="url" value={form.url || ''} onChange={(e) => set('url', e.target.value)} />}</Field>
          <Field label="Document reference" name="documentReference" error={errors.documentReference}>{(props) => <Input {...props} value={form.documentReference || ''} onChange={(e) => set('documentReference', e.target.value)} />}</Field>
        </div>
      </FormSection>
      <FormSection title="Dates and notes">
        <div className="admin-form-grid">
          <Field label="Publication date" name="publicationDate" error={errors.publicationDate}>{(props) => <Input {...props} type="date" value={form.publicationDate || ''} onChange={(e) => set('publicationDate', e.target.value)} />}</Field>
          <Field label="Effective date" name="effectiveDate" error={errors.effectiveDate}>{(props) => <Input {...props} type="date" value={form.effectiveDate || ''} onChange={(e) => set('effectiveDate', e.target.value)} />}</Field>
          <Field label="Retrieved / checked date" name="accessedAt" error={errors.accessedAt}>{(props) => <Input {...props} type="date" value={form.accessedAt || ''} onChange={(e) => set('accessedAt', e.target.value)} />}</Field>
        </div>
        <div className="mt-4"><Field label="Notes" name="notes" error={errors.notes}>{(props) => <Textarea {...props} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />}</Field></div>
      </FormSection>
    </>
  );
}

function EvidenceManager({ fee }) {
  const sources = useOptions('sources');
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  async function attach() {
    if (!selected) return;
    try {
      await adminApi.linkFeeSource(fee.id, { sourceId: Number(selected), isPrimary: false });
      setNotice('Source attached. Refresh the fee detail to see the updated evidence list.');
      setSelected('');
    } catch (error) { setNotice(error.message); }
  }
  return (
    <section id="evidence" className="admin-panel mt-4 p-4 sm:p-5">
      <h2 className="font-extrabold text-navy">Attach authoritative evidence</h2>
      <p className="mt-1 text-sm text-slate-500">A source can support several fees; attaching it does not duplicate the source.</p>
      {notice && <div className="mt-3"><InlineNotice>{notice}</InlineNotice></div>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="admin-input min-w-0 flex-1" aria-label="Source to attach"><option value="">Select a source</option>{sources.items.map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}</select>
        <button type="button" onClick={attach} disabled={!selected} className="secondary-button">Attach source</button>
      </div>
    </section>
  );
}

function FeeSupersessionPanel({ fee }) {
  const sources = useOptions('sources');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [sourceIds, setSourceIds] = useState([]);
  const [review, setReview] = useState({ reason: '', evidenceSummary: '', verificationMethod: '', checkedAt: '' });
  const [replacement, setReplacement] = useState({ ...defaults.fees, serviceId: fee.serviceId, pricingModel: fee.pricingModel, verificationStatus: 'pending' });
  const model = replacement.pricingModel;
  const setReplacementValue = (key, value) => setReplacement((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (!sourceIds.length) { setNotice('Select at least one authoritative source.'); return; }
    setSaving(true); setNotice('');
    try {
      const result = await adminApi.supersedeFee(fee.id, {
        newFee: payloadFor('fees', { ...replacement, serviceId: fee.serviceId, isCurrent: true }),
        sourceIds,
        ...review,
        checkedAt: review.checkedAt ? new Date(review.checkedAt).toISOString() : undefined,
      });
      setNotice(`Replacement fee #${result.id} created. The previous fee is now superseded.`);
      setOpen(false);
    } catch (error) { setNotice(error.message); } finally { setSaving(false); }
  }
  return (
    <section className="admin-panel mt-4 border-amber-200 p-4 sm:p-5">
      <h2 className="font-extrabold text-navy">Fee change / supersession</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Use this workflow when an official fee changes. It preserves the current record as history, creates a replacement, links evidence, records verification activity and writes audit entries atomically.</p>
      {notice && <div className="mt-3"><InlineNotice tone={notice.includes('created') ? 'success' : 'warning'}>{notice}</InlineNotice></div>}
      {!open ? <button type="button" onClick={() => setOpen(true)} className="secondary-button mt-4">Start supersession workflow</button> : (
        <form onSubmit={submit} className="mt-5 space-y-5 border-t border-slate-200 pt-5">
          <div className="admin-form-grid">
            <Field label="Replacement label" name="replacement-label">{(props) => <Input {...props} value={replacement.label} onChange={(e) => setReplacementValue('label', e.target.value)} />}</Field>
            <Field label="Pricing model" name="replacement-model" required>{(props) => <Select {...props} value={model} onChange={(e) => setReplacementValue('pricingModel', e.target.value)}>{pricingModels.map((item) => <option key={item}>{item}</option>)}</Select>}</Field>
            <Field label="New status" name="replacement-status" required>{(props) => <Select {...props} value={replacement.verificationStatus} onChange={(e) => setReplacementValue('verificationStatus', e.target.value)}>{verificationStatuses.filter((item) => item !== 'superseded').map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</Select>}</Field>
            {['fixed', 'range'].includes(model) && <Field label="Currency" name="replacement-currency" required>{(props) => <Input {...props} value={replacement.currency || ''} maxLength="3" onChange={(e) => setReplacementValue('currency', e.target.value.toUpperCase())} required />}</Field>}
            {model === 'fixed' && <Field label="Amount" name="replacement-amount" required>{(props) => <Input {...props} type="number" min="0.01" step="0.01" value={replacement.amount} onChange={(e) => setReplacementValue('amount', e.target.value)} required />}</Field>}
            {model === 'range' && <><Field label="Minimum" name="replacement-minimum" required>{(props) => <Input {...props} type="number" min="0.01" step="0.01" value={replacement.minimumAmount} onChange={(e) => setReplacementValue('minimumAmount', e.target.value)} required />}</Field><Field label="Maximum" name="replacement-maximum" required>{(props) => <Input {...props} type="number" min="0.01" step="0.01" value={replacement.maximumAmount} onChange={(e) => setReplacementValue('maximumAmount', e.target.value)} required />}</Field></>}
            {model === 'percentage' && <Field label="Percentage" name="replacement-percentage" required>{(props) => <Input {...props} type="number" min="0.01" step="0.01" value={replacement.percentage} onChange={(e) => setReplacementValue('percentage', e.target.value)} required />}</Field>}
          </div>
          {model === 'formula' && <Field label="Formula" name="replacement-formula" required>{(props) => <Textarea {...props} value={replacement.formula} onChange={(e) => setReplacementValue('formula', e.target.value)} required />}</Field>}
          {model === 'variable' && <Field label="Conditions" name="replacement-conditions" required>{(props) => <Textarea {...props} value={replacement.conditions} onChange={(e) => setReplacementValue('conditions', e.target.value)} required />}</Field>}
          {model === 'unknown' && <InlineNotice tone="warning">No numeric amount will be sent for an unknown replacement fee.</InlineNotice>}
          <fieldset><legend className="text-sm font-bold text-slate-800">Authoritative evidence <span className="text-red-700">*</span></legend><div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">{sources.items.map((source) => <label key={source.id} className="flex min-h-10 items-start gap-2 rounded-lg p-2 text-sm hover:bg-slate-50"><input type="checkbox" className="mt-1 h-4 w-4" checked={sourceIds.includes(Number(source.id))} onChange={(e) => setSourceIds((current) => e.target.checked ? [...current, Number(source.id)] : current.filter((id) => id !== Number(source.id)))} /><span><span className="font-bold text-navy">{source.title}</span><span className="block text-xs capitalize text-slate-500">{source.sourceType?.replaceAll('_', ' ')}</span></span></label>)}</div></fieldset>
          <div className="grid gap-4 lg:grid-cols-2"><Field label="Reason for change" name="replacement-reason" required>{(props) => <Textarea {...props} value={review.reason} onChange={(e) => setReview({ ...review, reason: e.target.value })} required />}</Field><Field label="Evidence summary" name="replacement-evidence" required>{(props) => <Textarea {...props} value={review.evidenceSummary} onChange={(e) => setReview({ ...review, evidenceSummary: e.target.value })} required />}</Field><Field label="Verification method" name="replacement-method" required>{(props) => <Input {...props} value={review.verificationMethod} onChange={(e) => setReview({ ...review, verificationMethod: e.target.value })} required />}</Field><Field label="Checked date/time" name="replacement-checked">{(props) => <Input {...props} type="datetime-local" value={review.checkedAt} onChange={(e) => setReview({ ...review, checkedAt: e.target.value })} />}</Field></div>
          <div className="flex flex-wrap gap-2"><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-700 px-4 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-60">{saving ? 'Replacing…' : 'Create replacement and supersede current fee'}</button><button type="button" onClick={() => setOpen(false)} className="secondary-button">Cancel</button></div>
        </form>
      )}
    </section>
  );
}
