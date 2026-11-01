const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadNecoCatalogue, NECO_CATALOGUE_PATH, BATCH_01_SLUGS, BATCH_02_SLUGS, BATCH_03_SLUGS } = require('../scripts/import-production-manifest');

test('NECO evidence catalogue is valid, distinct, historical, and publication-inert', () => {
  const catalogue = loadNecoCatalogue();
  assert.equal(catalogue.mda.slug, 'neco');
  assert.equal(catalogue.mda.coverageStatus, 'inactive');
  assert.equal(catalogue.temporalClassification, 'HISTORICAL_OR_SUPERSEDED');
  assert.equal(catalogue.services.length, 6);
  const slugs = catalogue.services.map((service) => service.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  const identities = catalogue.services.flatMap((service) => service.feeOptions.map((fee) => [service.slug, fee.label, fee.amount, fee.conditions].join('|')));
  assert.equal(new Set(identities).size, 6, 'distinct NECO charge identities must not be collapsed');
  for (const service of catalogue.services) {
    assert.ok(service.description.includes('2026 SSCE Internal examination cycle'));
    assert.ok(service.notes.includes('2026 SSCE Internal examination cycle'));
    assert.equal(service.feeOptions.length, 1);
    assert.ok(service.feeOptions[0].conditions.includes('2026 SSCE Internal examination cycle'));
    assert.equal(service.feeOptions[0].verificationStatus, 'superseded');
  }
  assert.deepEqual(Object.keys(catalogue).sort(), ['mda', 'services', 'sources', 'status', 'temporalClassification', 'version'].sort());
  assert.equal(JSON.stringify(catalogue).includes('reviewEvents'), false, 'catalogue must not fabricate human review events');
  for (const batch of [BATCH_01_SLUGS, BATCH_02_SLUGS, BATCH_03_SLUGS]) assert.equal(batch.includes('neco'), false);
  assert.ok(fs.existsSync(path.resolve(NECO_CATALOGUE_PATH)));
});
