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
  if (model === 'free') return { label: 'Free', detail: 'No fee is listed for this option.' };
  if (model === 'fixed') { const amount = formatCurrency(valueOf(option, 'amount'), currency); return amount ? { label: amount, detail: 'Fixed fee' } : { label: 'Fixed fee', detail: 'Amount not provided.' }; }
  if (model === 'range') { const minimum = formatCurrency(valueOf(option, 'minAmount', 'min_amount'), currency); const maximum = formatCurrency(valueOf(option, 'maxAmount', 'max_amount'), currency); return { label: minimum && maximum ? `${minimum} – ${maximum}` : 'Fee range', detail: 'Range varies by the details of the service.' }; }
  if (model === 'percentage') { const percentage = valueOf(option, 'percentage'); return { label: percentage !== undefined ? `${percentage}%` : 'Percentage fee', detail: 'Calculated as a percentage.' }; }
  if (model === 'formula') return { label: 'Calculated fee', detail: valueOf(option, 'formula') || 'The source provides a calculation formula.' };
  if (model === 'variable') return { label: 'Variable fee', detail: valueOf(option, 'notes', 'description') || 'The amount varies. Review the evidence and official channel.' };
  return { label: 'Fee not established', detail: 'An authoritative current amount has not been established. This does not mean free.' };
}

export function asArray(value) { return Array.isArray(value) ? value : []; }

