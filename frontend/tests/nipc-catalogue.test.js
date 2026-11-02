import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatFee } from '../src/lib/format.js';

const catalogue = JSON.parse(await readFile(new URL('../../research/production-import/batch-04-mdas.json', import.meta.url), 'utf8'));
const mda = catalogue.mdas[0];

test('NIPC public scope has the three approved services and exact fee option counts', () => {
  assert.equal(mda.slug, 'nipc');
  assert.equal(mda.services.length, 3);
  assert.deepEqual(mda.services.map((service) => service.slug), [
    'business-registration-certificate',
    'economic-development-incentive-new-application',
    'osic-export-certificate-registration',
  ]);
  assert.deepEqual(mda.services.map((service) => service.feeOptions.length), [3, 1, 3]);
});

test('EDI percentage fee renders as a percentage and not a fixed cap amount', () => {
  const fee = mda.services[1].feeOptions[0];
  assert.equal(formatFee(fee).label, '0.01%');
  assert.equal(fee.maximumAmount, 5_000_000);
  assert.equal(fee.amount, null);
  assert.match(fee.notes, /calculation base is not stated/i);
});

test('NEPC late renewal remains a separate fee with its expiry condition', () => {
  const fee = mda.services[2].feeOptions[2];
  assert.equal(fee.label, 'Late Certificate Renewal');
  assert.equal(fee.amount, 12_500);
  assert.equal(fee.conditions, 'After three months of expiry');
});
