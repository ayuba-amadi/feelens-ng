import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, formatDate, formatFee, formatSourceType } from './format.js';
import { isNimcCharterSource, nimcPdfPage, nimcPrintedPage, nimcSectionLabel, nimcViewerHref } from './nimc.js';

test('NIMC SLA source metadata resolves PDF page 31, printed page 28, and Section 12.5', () => {
  const source = {
    title: 'NIMC Service Level Agreement',
    sourceType: 'service_level_agreement',
    url: 'https://feelens.ng/sources/nimc-service-charter-february-2026.pdf',
    pageOrSection: 'Section 12.5 Regular Modification Services (Within Nigeria) · Printed page 28 (PDF page 31)',
  };

  assert.equal(isNimcCharterSource(source), true);
  assert.equal(nimcPdfPage(source), 31);
  assert.equal(nimcPrintedPage(source), 28);
  assert.equal(nimcSectionLabel(source), '12.5 Regular Modification Services (Within Nigeria)');
  assert.equal(nimcViewerHref(source), '/sources/nimc-service-charter?page=31');
  assert.equal(formatSourceType(source.sourceType), 'Service Level Agreement');
});

test('NIMC regular modification fee formatting renders exact NGN currency amounts', () => {
  const dobFee = formatFee({ pricingModel: 'fixed', amount: 28574, currency: 'NGN' });
  const otherInfoFee = formatFee({ pricingModel: 'fixed', amount: 2000, currency: 'NGN' });

  assert.equal(dobFee.label, formatCurrency(28574, 'NGN'));
  assert.match(dobFee.label, /28,574/);
  assert.equal(otherInfoFee.label, formatCurrency(2000, 'NGN'));
  assert.match(otherInfoFee.label, /2,000/);
  assert.match(formatDate('2026-11-02'), /2026/);
});
