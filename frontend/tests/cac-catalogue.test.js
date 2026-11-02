import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatFee } from '../src/lib/format.js';
import { CAC_FEATURED_GROUPS, cacCompanyChangeFeeOptions, cacFeaturedCardFee, groupCacServices } from '../src/lib/cac.js';
import { collectPages } from '../src/lib/pagination.js';

const catalogue = JSON.parse(await readFile(new URL('../../research/production-import/cac-service-catalogue.json', import.meta.url), 'utf8'));
const bySlug = new Map(catalogue.services.map((service) => [service.slug, service]));
const apiCatalogueServices = catalogue.services.map((service) => ({
  ...service,
  catalogueGroup: CAC_FEATURED_GROUPS.find((group) => group.slugs.includes(service.slug))?.key || 'other',
}));

test('CAC featured groups contain exactly the approved five registration and five name-change services', () => {
  assert.deepEqual(CAC_FEATURED_GROUPS.map((group) => [group.label, group.slugs]), [
    ['Registration', [
      'business-name-registration-ctc-registration-documents',
      'company-with-share-capital-small-private-other-than-small',
      'cac-007-incorporation-of-incorporated-trustees',
      'cac-008-registration-of-limited-partnership',
      'cac-009-registration-of-limited-liability-partnership',
    ]],
    ['Change of Name', [
      'cac-010-change-of-name-business-name',
      'cac-011-change-of-name-company',
      'cac-012-change-of-name-incorporated-trustees',
      'cac-013-change-of-name-limited-partnership',
      'cac-014-change-of-name-limited-liability-partnership',
    ]],
  ]);
  const grouped = groupCacServices(apiCatalogueServices);
  assert.deepEqual(grouped.featuredGroups.map((group) => group.services.length), [5, 5]);
  assert.equal(grouped.featuredGroups.flatMap((group) => group.services).length, 10);
  assert.equal(grouped.otherServices.length, apiCatalogueServices.length - 10);
  assert.equal(grouped.otherServices.some((service) => CAC_FEATURED_GROUPS.some((group) => group.slugs.includes(service.slug))), false);
});

test('API catalogueGroup is primary and the approved slug list is a defensive allowlist', () => {
  const businessName = apiCatalogueServices.find((service) => service.slug === 'business-name-registration-ctc-registration-documents');
  const unknownRegistration = { slug: 'unapproved-registration', name: 'Unapproved registration', catalogueGroup: 'registration' };
  const input = [
    { ...businessName, catalogueGroup: 'other' },
    { ...unknownRegistration },
    ...apiCatalogueServices.filter((service) => service.slug !== businessName.slug),
  ];
  const grouped = groupCacServices(input);
  assert.equal(grouped.featuredGroups.flatMap((group) => group.services).length, 9);
  assert.ok(grouped.otherServices.some((service) => service.slug === businessName.slug));
  assert.ok(grouped.otherServices.some((service) => service.slug === 'unapproved-registration'));
});

test('CAC service collection follows pagination so all Other Services stay reachable', async () => {
  const pageCalls = [];
  const result = await collectPages(async (page, pageSize) => {
    pageCalls.push({ page, pageSize });
    return {
      items: page === 1 ? [{ slug: 'one' }, { slug: 'two' }] : [{ slug: 'three' }],
      total: 3,
      hasMore: page === 1,
    };
  }, 2);
  assert.deepEqual(result.items.map((service) => service.slug), ['one', 'two', 'three']);
  assert.equal(result.total, 3);
  assert.deepEqual(pageCalls, [{ page: 1, pageSize: 2 }, { page: 2, pageSize: 2 }]);
});

test('the approved service fees and official iCRP channel match the CAC curation', () => {
  const expected = [
    ['business-name-registration-ctc-registration-documents', 20_000],
    ['cac-007-incorporation-of-incorporated-trustees', 40_000],
    ['cac-008-registration-of-limited-partnership', 30_000],
    ['cac-009-registration-of-limited-liability-partnership', 40_000],
    ['cac-010-change-of-name-business-name', 10_000],
    ['cac-012-change-of-name-incorporated-trustees', 25_000],
    ['cac-013-change-of-name-limited-partnership', 10_000],
    ['cac-014-change-of-name-limited-liability-partnership', 20_000],
  ];
  for (const [slug, amount] of expected) {
    const service = bySlug.get(slug);
    assert.ok(service, `missing ${slug}`);
    assert.equal(service.feeOptions[0].pricingModel, 'fixed');
    assert.equal(service.feeOptions[0].amount, amount);
    assert.equal(service.officialActionUrl, 'https://icrp.cac.gov.ng/');
  }
});

test('company registration remains formula-priced and does not render a fixed ₦10,000 total', () => {
  const service = bySlug.get('company-with-share-capital-small-private-other-than-small');
  const option = service.feeOptions[0];
  assert.equal(option.pricingModel, 'formula');
  assert.equal(option.amount, null);
  assert.match(option.formula, /10,000 for every/);
  assert.match(option.formula, /20,000 for every/);
  assert.match(option.notes, /Stamp duty/);
  assert.notEqual(formatFee(option).label, '₦10,000');
  assert.equal(cacFeaturedCardFee(service.slug).label, 'Share-capital formula');
  assert.notEqual(cacFeaturedCardFee(service.slug).label, '₦10,000');
});

test('company name changes retain three separate tiered amounts and conditions', () => {
  const service = bySlug.get('cac-011-change-of-name-company');
  assert.deepEqual(service.feeOptions.map((option) => [option.label, option.amount]), [
    ['Small Company', 10_000],
    ['Company other than Small Company and LTD/GTE', 20_000],
    ['Public Company', 50_000],
  ]);
  assert.deepEqual(cacCompanyChangeFeeOptions().map((option) => option.amount), [10_000, 20_000, 50_000]);
  assert.equal(cacFeaturedCardFee(service.slug).label, '3 fee options');
});

test('only approved CAC records are featured; remaining catalogue records are retained as Other Services', () => {
  const grouped = groupCacServices(apiCatalogueServices);
  assert.equal(grouped.featuredGroups.flatMap((group) => group.services).length, 10);
  assert.equal(grouped.otherServices.length, apiCatalogueServices.length - 10);
  assert.ok(grouped.otherServices.every((service) => Array.isArray(service.feeOptions)));
  assert.ok(grouped.otherServices.every((service) => Array.isArray(service.requirements)));
});

test('CAC requirements and channels use only the approved source entries', () => {
  const expectedRequirements = {
    'business-name-registration-ctc-registration-documents': ['Means of Identification of Proprietor(s)', 'Passport photograph of Proprietor(s)', 'Signature of Proprietor(s)'],
    'company-with-share-capital-small-private-other-than-small': ['Means of Identification of Director(s), Shareholder(s), and Secretary where applicable', 'Signatures of Director(s), Shareholder(s), Secretary where applicable, and witness', 'Proficiency certificate where applicable', 'Letter of No Objection where applicable', 'Approval-in-Principle where applicable', 'Residence Permit where applicable'],
    'cac-007-incorporation-of-incorporated-trustees': ['Means of Identification of Trustees and Secretary, if any', 'Signature of Trustees, Secretary, if any, and Chairman', 'Trustees’ Declaration form', 'Newspaper publications (2)', 'Minutes of meeting'],
    'cac-008-registration-of-limited-partnership': ['Means of Identification of Partners', 'Passport photograph of Partners', 'Signature of Partners'],
    'cac-009-registration-of-limited-liability-partnership': ['Means of Identification of Partners', 'Signature of Partners'],
    'cac-010-change-of-name-business-name': ['Nil'],
    'cac-011-change-of-name-company': ['Special Resolution'],
    'cac-012-change-of-name-incorporated-trustees': ['Minutes of meeting signed by the existing Chairman and Secretary, if any, on record', 'Newspaper publications (2)', 'Public notice'],
    'cac-013-change-of-name-limited-partnership': ['Nil'],
    'cac-014-change-of-name-limited-liability-partnership': ['Special Resolution'],
  };
  for (const [slug, requirements] of Object.entries(expectedRequirements)) {
    assert.deepEqual(bySlug.get(slug).requirements, requirements, slug);
    assert.equal(bySlug.get(slug).officialActionUrl, 'https://icrp.cac.gov.ng/');
  }
  for (const group of CAC_FEATURED_GROUPS) for (const slug of group.slugs) {
    assert.ok(bySlug.get(slug).feeOptions.every((option) => option.sourceKeys?.length), `${slug} retains fee evidence mapping`);
  }
});
