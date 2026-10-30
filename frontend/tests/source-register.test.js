import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceRows, filterSources } from '../src/lib/source-register.js';
import { formatFee, formatSourceType } from '../src/lib/format.js';

test('register filters stored associations using public slugs and preserves shared sources', () => {
  const rows = sourceRows([{ title: 'FAQ', sourceType: 'official_faq', evidenceTier: 2, associations: [
    { mdaSlug: 'first', mdaName: 'First', serviceSlug: 'a', serviceName: 'Service A', verificationStatus: 'verified' },
    { mdaSlug: 'first', mdaName: 'First', serviceSlug: 'a', serviceName: 'Service A', verificationStatus: 'pending' },
    { mdaSlug: 'second', mdaName: 'Second', serviceSlug: 'b', serviceName: 'Service B', verificationStatus: 'pending' },
  ] }, { title: 'Unlinked', associations: [] }]);
  assert.equal(rows[0].services.length, 2);
  assert.deepEqual(filterSources(rows, { mda: 'second', status: 'pending' }).map((x) => x.title), ['FAQ']);
  assert.deepEqual(filterSources(rows, { query: 'service a', sourceType: 'official_faq', tier: '2' }).map((x) => x.title), ['FAQ']);
  assert.equal(filterSources(rows, { mda: 'absent' }).length, 0);
  assert.equal(rows[1].services.length, 0);
});

test('source types and fee models have public labels', () => {
  assert.equal(formatSourceType('official_faq'), 'Official FAQ');
  assert.equal(formatSourceType('statutory_instrument'), 'Statutory Instrument');
  assert.equal(formatFee({ pricingModel: 'unknown' }).label, 'Fee not established');
  assert.equal(formatFee({ pricingModel: 'free' }).label, 'Free');
});
