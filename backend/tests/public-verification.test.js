const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hasValidPublicReview,
  projectPublicFeeStatus,
  publicFeeStatusSql,
} = require('../src/services/public-verification');

const feeOption = {
  id: 17,
  service_id: 4,
  pricing_model: 'fixed',
  currency: 'NGN',
  amount: '500.00',
  min_amount: null,
  max_amount: null,
  percentage: null,
  formula: null,
  conditions: 'Adult applicant',
  label: 'Standard fee',
  notes: null,
  is_current: true,
  verification_status: 'verified',
};

function validEvent(overrides = {}) {
  return {
    fee_option_id: feeOption.id,
    service_id: feeOption.service_id,
    status: 'verified',
    actor_admin_user_id: 9,
    reviewer_role: 'admin',
    reviewer_display_name: 'Review Admin',
    checked_by: 'Review Admin',
    checked_at: '2026-10-31T12:00:00.000Z',
    source_id: 31,
    evidence_summary: 'Official fee page supports the amount.',
    verification_method: 'Compared fee and applicant conditions with official page.',
    new_values: { ...feeOption },
    ...overrides,
  };
}

test('stored verified flag without a review event projects as source-supported', () => {
  assert.equal(projectPublicFeeStatus({ feeOption, linkedSources: [{ id: 31, sourceType: 'official_website' }] }), 'source_supported');
  assert.equal(projectPublicFeeStatus({ feeOption }), 'pending');
  assert.equal(projectPublicFeeStatus({ feeOption, linkedSources: [{ id: 31, sourceType: 'other' }] }), 'pending');
});

test('verified projection requires an authorised reviewer, linked source, review details, and matching current snapshot', () => {
  const event = validEvent();
  const linkedSources = [{ id: 31, sourceType: 'official_website' }];
  assert.equal(hasValidPublicReview({ feeOption, reviewEvents: [event], linkedSources }), true);
  assert.equal(projectPublicFeeStatus({ feeOption, reviewEvents: [event], linkedSources }), 'verified');
});

test('review event for an old fee snapshot cannot verify the current claim', () => {
  const event = validEvent({ new_values: { ...feeOption, amount: '450.00' } });
  assert.equal(projectPublicFeeStatus({ feeOption, reviewEvents: [event], linkedSources: [{ id: 31, sourceType: 'official_website' }] }), 'source_supported');
});

test('review event missing reviewer identity cannot verify the claim', () => {
  const event = validEvent({ actor_admin_user_id: null, reviewer_display_name: null });
  assert.equal(projectPublicFeeStatus({ feeOption, reviewEvents: [event], linkedSources: [{ id: 31, sourceType: 'official_website' }] }), 'source_supported');
});

test('review event whose source is not linked to the fee cannot verify the claim', () => {
  assert.equal(projectPublicFeeStatus({ feeOption, reviewEvents: [validEvent()], linkedSources: [{ id: 32, sourceType: 'official_website' }] }), 'source_supported');
});

test('review event without substantive review details cannot verify the claim', () => {
  const event = validEvent({ evidence_summary: '  ', verification_method: '' });
  assert.equal(projectPublicFeeStatus({ feeOption, reviewEvents: [event], linkedSources: [{ id: 31, sourceType: 'official_website' }] }), 'source_supported');
});

test('conflicting and historical claims retain their distinct public states', () => {
  assert.equal(projectPublicFeeStatus({ feeOption: { ...feeOption, verification_status: 'conflicting' } }), 'conflicting');
  assert.equal(projectPublicFeeStatus({ feeOption: { ...feeOption, verification_status: 'superseded', is_current: false } }), 'historical_or_superseded');
});

test('public SQL requires a reviewer, linked source, complete review, and matching current snapshot', () => {
  const sql = publicFeeStatusSql('claim');
  assert.match(sql, /verification_events/);
  assert.match(sql, /admin_users reviewer/);
  assert.match(sql, /fee_sources review_source/);
  assert.match(sql, /sources public_source/);
  assert.match(sql, /evidence_summary/);
  assert.match(sql, /verification_method/);
  assert.match(sql, /new_values \?& ARRAY/);
  assert.match(sql, /new_values ->> 'amount'/);
  assert.match(sql, /source_supported/);
  assert.match(sql, /historical_or_superseded/);
});
