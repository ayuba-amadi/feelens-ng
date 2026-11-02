import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, formatDate, formatFee, formatSourceType } from './format.js';
import {
  NIMC_CANONICAL_SERVICE_ORDER,
  groupNimcServices,
  isNimcCharterSource,
  nimcPdfPage,
  nimcPrintedPage,
  nimcSectionLabel,
  nimcViewerHref,
  sortNimcServices,
} from './nimc.js';

test('NIMC SLA source metadata resolves PDF pages, printed pages, and section labels across all 6 approved sections', () => {
  const sections = [
    {
      pageOrSection: 'Section 12.5 Regular Modification Services (Within Nigeria) · Printed page 28 (PDF page 31)',
      printedPage: 28,
      pdfPage: 31,
      label: '12.5 Regular Modification Services (Within Nigeria)',
    },
    {
      pageOrSection: 'Section 13.1 Regular Enrolment for African Countries · Printed page 29 (PDF page 32)',
      printedPage: 29,
      pdfPage: 32,
      label: '13.1 Regular Enrolment for African Countries',
    },
    {
      pageOrSection: 'Section 13.2 Regular Modification for African Countries · Printed page 29 (PDF page 32)',
      printedPage: 29,
      pdfPage: 32,
      label: '13.2 Regular Modification for African Countries',
    },
    {
      pageOrSection: 'Section 14.0 Premium Enrolment for African Countries · Printed page 30 (PDF page 33)',
      printedPage: 30,
      pdfPage: 33,
      label: '14.0 Premium Enrolment for African Countries',
    },
    {
      pageOrSection: 'Section 14.1 Premium Modification for African Countries · Printed page 30 (PDF page 33)',
      printedPage: 30,
      pdfPage: 33,
      label: '14.1 Premium Modification for African Countries',
    },
    {
      pageOrSection: 'Section 15.0 Regular Enrolment for Non-African Countries · Printed page 31 (PDF page 34)',
      printedPage: 31,
      pdfPage: 34,
      label: '15.0 Regular Enrolment for Non-African Countries',
    },
  ];

  for (const item of sections) {
    const source = {
      title: 'NIMC Service Level Agreement',
      sourceType: 'service_level_agreement',
      url: 'https://feelens.ng/sources/nimc-service-charter-february-2026.pdf',
      pageOrSection: item.pageOrSection,
    };

    assert.equal(isNimcCharterSource(source), true);
    assert.equal(nimcPdfPage(source), item.pdfPage);
    assert.equal(nimcPrintedPage(source), item.printedPage);
    assert.equal(nimcSectionLabel(source), item.label);
    assert.equal(nimcViewerHref(source), `/sources/nimc-service-charter?page=${item.pdfPage}`);
    assert.equal(formatSourceType(source.sourceType), 'Service Level Agreement');
  }
});

test('NIMC fee formatting renders exact NGN, USD, and Free labels', () => {
  const dobFee = formatFee({ pricingModel: 'fixed', amount: 28574, currency: 'NGN' });
  const otherInfoFee = formatFee({ pricingModel: 'fixed', amount: 2000, currency: 'NGN' });
  const usdFee = formatFee({ pricingModel: 'fixed', amount: 50, currency: 'USD' });
  const freeFee = formatFee({ pricingModel: 'free', amount: null, currency: 'USD' });

  assert.equal(dobFee.label, formatCurrency(28574, 'NGN'));
  assert.match(dobFee.label, /28,574/);
  assert.equal(otherInfoFee.label, formatCurrency(2000, 'NGN'));
  assert.match(otherInfoFee.label, /2,000/);
  assert.equal(usdFee.label, 'US$50');
  assert.equal(freeFee.label, 'Free');
  assert.match(formatDate('2026-11-02'), /2026/);
});

test('groupNimcServices and sortNimcServices organize all 20 services into the 6 canonical categories', () => {
  assert.equal(NIMC_CANONICAL_SERVICE_ORDER.length, 20);
  const sampleServices = [
    { slug: 'nimc-diaspora-regular-gmpc-non-africa', jurisdiction: 'Non-African Countries', category: 'Regular Enrolment' },
    { slug: 'nimc-date-of-birth-modification', jurisdiction: 'Within Nigeria', category: 'Regular Modification Services' },
    { slug: 'nimc-diaspora-regular-enrolment-adult-africa', jurisdiction: 'African Countries', category: 'Regular Enrolment' },
    { slug: 'nimc-diaspora-regular-dob-africa', jurisdiction: 'African Countries', category: 'Regular Modification' },
    { slug: 'nimc-diaspora-premium-enrolment-adult-africa', jurisdiction: 'African Countries', category: 'Premium Enrolment' },
    { slug: 'nimc-diaspora-premium-dob-africa', jurisdiction: 'African Countries', category: 'Premium Modification' },
  ];

  const sorted = sortNimcServices(sampleServices);
  assert.equal(sorted[0].slug, 'nimc-date-of-birth-modification');
  assert.equal(sorted[sorted.length - 1].slug, 'nimc-diaspora-regular-gmpc-non-africa');

  const allGroups = groupNimcServices(sampleServices, 'all');
  assert.equal(allGroups.length, 6);
  const africaGroups = groupNimcServices(sampleServices, 'african-countries');
  assert.equal(africaGroups.length, 4);
  assert.ok(africaGroups.every((group) => group.jurisdiction === 'African Countries'));
});
