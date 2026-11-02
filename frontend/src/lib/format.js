export function valueOf(record, ...keys) {
  if (!record || typeof record !== 'object') return undefined;
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key];
  return undefined;
}

export function normalizeStatus(value) { return String(value || 'status_not_listed').toLowerCase().replace(/\s+/g, '_'); }

export function formatDate(value) {
  if (!value) return 'Date not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(date);
}

export function formatDateTime(value) {
  if (!value) return 'Date not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatCount(value) {
  if (value === undefined || value === null || value === '') return '—';
  return new Intl.NumberFormat('en-NG').format(value);
}

export function formatCurrency(amount, currency = 'NGN') {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return null;
  if (currency === 'USD') return `US$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(numericAmount)}`;
  try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(numericAmount); } catch { return `${currency} ${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 2 }).format(numericAmount)}`; }
}

export function formatFee(option) {
  const model = String(valueOf(option, 'pricingModel', 'pricing_model', 'model') || 'unknown').toLowerCase();
  const currency = valueOf(option, 'currency') || 'NGN';
  if (model === 'free') return { label: 'Free', detail: 'Recorded as free; check the verification status and evidence.' };
  if (model === 'fixed') { const amount = formatCurrency(valueOf(option, 'amount'), currency); return amount ? { label: amount, detail: 'Fixed fee' } : { label: 'Fixed fee', detail: 'Amount not provided.' }; }
  if (model === 'range') { const minimum = formatCurrency(valueOf(option, 'minAmount', 'minimumAmount', 'min_amount'), currency); const maximum = formatCurrency(valueOf(option, 'maxAmount', 'maximumAmount', 'max_amount'), currency); return { label: minimum && maximum ? `${minimum} – ${maximum}` : 'Fee range', detail: 'Range varies by the details of the service.' }; }
  if (model === 'percentage') { const rawPercentage = valueOf(option, 'percentage'); const percentage = rawPercentage === undefined ? null : Number(rawPercentage); return { label: Number.isFinite(percentage) ? `${percentage}%` : 'Percentage fee', detail: 'Calculated as a percentage.' }; }
  if (model === 'formula') return { label: 'Calculated fee', detail: valueOf(option, 'formula') || 'The source provides a calculation formula.' };
  if (model === 'variable') return { label: 'Variable fee', detail: valueOf(option, 'conditions', 'notes', 'description') || 'The amount varies. Review the evidence and official channel.' };
  return { label: 'Fee not established', detail: 'An authoritative current amount has not been established. This does not mean free.' };
}

export function asArray(value) { return Array.isArray(value) ? value : []; }


export function formatSourceType(value) {
  const labels = { OFFICIAL_FAQ: 'Official FAQ', OFFICIAL_WEBSITE: 'Official website', OFFICIAL_PORTAL: 'Official portal', OFFICIAL_GUIDELINE: 'Official guideline', OFFICIAL_PROCESS_PAGE: 'Official process page', OFFICIAL_FEE_PAGE: 'Official fee page', GAZETTE: 'Government Gazette', CIRCULAR: 'Official Circular', REGULATION: 'Regulation', FEE_SCHEDULE: 'Official Fee Schedule', APPROVED_FEE_SCHEDULE: 'Official Fee Schedule', STATUTORY_INSTRUMENT: 'Statutory Instrument', OFFICIAL_NOTICE: 'Official Notice', OFFICIAL_DOCUMENT: 'Official Document', SERVICE_LEVEL_AGREEMENT: 'Service Level Agreement' };
  if (!value) return null;
  return labels[String(value).toUpperCase()] || String(value).toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
