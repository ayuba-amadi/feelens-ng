const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  APPROVED_CAC_FEATURED_CLAIMS,
  APPROVED_CLAIM_COUNT,
  feeSnapshot,
  parseArguments,
  planCacFeaturedReconciliation,
} = require('../scripts/reconcile-cac-featured-verification');
const { hasValidPublicReview, projectPublicFeeStatus, publicFeeStatusSql } = require('../src/services/public-verification');

const reviewer = { id: '1', display_name: 'Amadi', role: 'admin', is_active: true };
const slaSource = { id: '57', title: 'Corporate Affairs Commission Service Level Agreement', source_type: 'service_level_agreement', publisher: 'Corporate Affairs Commission', url: 'https://www.cac.gov.ng/resources' };
const legacySchedule = { id: '8', title: 'CAC New Schedule of Fees', source_type: 'gazette_fee_schedule', publisher: 'Corporate Affairs Commission', url: 'https://news.cac.gov.ng/schedule.pdf' };
const reviewedAt = '2026-11-02T14:00:00.000Z';

function fee(id, serviceId, overrides) {
  return {
    id: String(id), service_id: String(serviceId), pricing_model: 'fixed', currency: 'NGN', amount: null,
    min_amount: null, max_amount: null, percentage: null, formula: null, conditions: null, label: null,
    notes: null, is_current: true, verification_status: 'verified', public_status: 'source_supported', ...overrides,
  };
}

const companyFormula = '10,000 for every N\n1,000,000 or part\nthereof (Small and\nOther than Small\nCompanies)\n20,000 for every N\n1,000,000 or part\nthereof (Public\nCompanies)';
const companyNotes = 'Separate statutory/external charge stated by the CAC SLA: Stamp duty: • 0.75% of the total\nvalue of the share\ncapital in the case\nof a company\nlimited by shares\n• 1,000 Naira in the\ncase of a\ncompany limited\nby guarantee. This is not modelled as a CAC service fee.';

// Mirrors the production CAC Featured state observed before reconciliation.
function fixture() {
  const services = [
    ['19', 'business-name-registration-ctc-registration-documents', 'registration'],
    ['20', 'company-with-share-capital-small-private-other-than-small', 'registration'],
    ['239', 'cac-007-incorporation-of-incorporated-trustees', 'registration'],
    ['240', 'cac-008-registration-of-limited-partnership', 'registration'],
    ['241', 'cac-009-registration-of-limited-liability-partnership', 'registration'],
    ['242', 'cac-010-change-of-name-business-name', 'change_of_name'],
    ['243', 'cac-011-change-of-name-company', 'change_of_name'],
    ['244', 'cac-012-change-of-name-incorporated-trustees', 'change_of_name'],
    ['245', 'cac-013-change-of-name-limited-partnership', 'change_of_name'],
    ['246', 'cac-014-change-of-name-limited-liability-partnership', 'change_of_name'],
  ].map(([id, slug, group]) => ({ id, slug, catalogue_group: group, is_active: true }));
  const fees = [
    fee(19, 19, { pricing_model: 'formula', formula: '₦20,000 statutory fee + ₦500 AI service charge from 1 Apr 2026', label: 'Business name registration + CTC of registration documents' }),
    fee(1072, 19, { amount: '20000.00', label: 'Registration of Business Name' }),
    fee(20, 20, { pricing_model: 'formula', formula: '₦10,000 for every ₦1,000,000 share capital or part thereof', label: 'Company with share capital - small/private other than small' }),
    fee(1073, 20, { pricing_model: 'formula', formula: companyFormula, conditions: companyFormula, label: 'Registration of Company', notes: companyNotes }),
    fee(1074, 239, { amount: '40000.00', label: 'Incorporation of Incorporated Trustees' }),
    fee(1075, 240, { amount: '30000.00', label: 'Registration of Limited Partnership' }),
    fee(1076, 241, { amount: '40000.00', label: 'Registration of Limited Liability Partnership' }),
    fee(1077, 242, { amount: '10000.00', label: 'Change of Name — Business Name' }),
    fee(1078, 243, { pricing_model: 'formula', formula: '10,000 (Small\nCompany)\n20,000 ...', label: 'Change of Name — Company', is_current: false, verification_status: 'superseded', public_status: 'historical_or_superseded' }),
    fee(1272, 243, { amount: '10000.00', label: 'Small Company', conditions: 'Applies to Small Companies.' }),
    fee(1273, 243, { amount: '20000.00', label: 'Company other than Small Company and LTD/GTE', conditions: 'Applies to a Company other than Small Company and LTD/GTE.' }),
    fee(1274, 243, { amount: '50000.00', label: 'Public Company', conditions: 'Applies to Public Companies.' }),
    fee(1079, 244, { amount: '25000.00', label: 'Change of Name — Incorporated Trustees' }),
    fee(1080, 245, { amount: '10000.00', label: 'Change of Name — Limited Partnership' }),
    fee(1081, 246, { amount: '20000.00', label: 'Change of Name — Limited Liability Partnership' }),
  ];
  const feeSources = fees
    .filter((item) => !['19', '20'].includes(item.id))
    .map((item) => ({ fee_option_id: item.id, source_id: '57', is_primary: true, page_or_section: 'CAC SLA PDF p. 11', excerpt: 'The April 2026 CAC SLA lists the fee for this service.' }))
    .concat([
      { fee_option_id: '19', source_id: '8', is_primary: true, page_or_section: null, excerpt: 'Statutory fee component.' },
      { fee_option_id: '20', source_id: '8', is_primary: true, page_or_section: null, excerpt: 'Share capital band.' },
    ]);
  return { services, fees, feeSources, sources: [slaSource, legacySchedule], events: [], reviewer, reviewedAt };
}

// Converts a planned event into the shape returned by the database join used for projection.
function persisted(event, id) {
  return { ...event, id: String(id), reviewer_role: reviewer.role, reviewer_display_name: reviewer.display_name };
}

function project(feeOption, events, state) {
  const linkedSources = state.feeSources
    .filter((link) => link.fee_option_id === feeOption.id)
    .map((link) => state.sources.find((source) => source.id === link.source_id));
  return projectPublicFeeStatus({ feeOption, reviewEvents: events.filter((event) => event.fee_option_id === feeOption.id), linkedSources });
}

const approvedFeeIds = ['1072', '1073', '1074', '1075', '1076', '1077', '1272', '1273', '1274', '1079', '1080', '1081'];

test('approved scope covers exactly the ten Featured CAC services and twelve reviewed claims', () => {
  assert.equal(APPROVED_CAC_FEATURED_CLAIMS.length, 10);
  assert.equal(APPROVED_CLAIM_COUNT, 12);
  assert.equal(new Set(APPROVED_CAC_FEATURED_CLAIMS.map((service) => service.slug)).size, 10);
});

test('dry run plans one reviewer-backed event per approved current claim and nothing for legacy or superseded fees', () => {
  const plan = planCacFeaturedReconciliation(fixture());
  assert.deepEqual(plan.summary.errors, []);
  assert.equal(plan.eventsToCreate.length, 12);
  assert.deepEqual(plan.eventsToCreate.map((event) => event.fee_option_id).sort(), [...approvedFeeIds].sort());
  assert.ok(!plan.eventsToCreate.some((event) => ['19', '20', '1078'].includes(event.fee_option_id)), 'legacy and superseded fees are never verified');
  assert.equal(plan.summary.missingSourceLinks, 0);
  assert.equal(plan.summary.duplicateEventRisks, 0);
  assert.deepEqual(plan.summary.reviewSourceIds, ['57']);
  assert.equal(plan.feesToSupersede.length, 0);
  assert.equal(plan.summary.warnings.length, 2, 'legacy fees outside the approved scope are reported');
  for (const event of plan.eventsToCreate) {
    assert.equal(event.status, 'verified');
    assert.equal(event.checked_by, 'Amadi');
    assert.equal(event.actor_admin_user_id, '1');
    assert.equal(event.source_id, '57');
    assert.equal(event.checked_at, reviewedAt);
    assert.ok(event.evidence_summary.includes('Corporate Affairs Commission Service Level Agreement'));
    assert.ok(event.verification_method.trim().length > 0);
  }
});

test('reviewed CAC Featured claims become verified when a valid reviewer-backed event exists', () => {
  const state = fixture();
  const plan = planCacFeaturedReconciliation(state);
  const events = plan.eventsToCreate.map(persisted);
  for (const id of approvedFeeIds) {
    assert.equal(project(state.fees.find((item) => item.id === id), events, state), 'verified', `fee ${id}`);
  }
});

test('source-supported CAC claims without human review remain source-supported; a source alone never verifies', () => {
  const state = fixture();
  for (const id of approvedFeeIds) assert.equal(project(state.fees.find((item) => item.id === id), [], state), 'source_supported');
  // Legacy fees outside the approved scope are not verified by the reconciliation either.
  const events = planCacFeaturedReconciliation(state).eventsToCreate.map(persisted);
  assert.equal(project(state.fees.find((item) => item.id === '19'), events, state), 'source_supported');
  assert.equal(project(state.fees.find((item) => item.id === '20'), events, state), 'source_supported');
});

test('event snapshot must match the current fee claim', () => {
  const state = fixture();
  const current = state.fees.find((item) => item.id === '1072');
  const [event] = planCacFeaturedReconciliation(state).eventsToCreate.filter((item) => item.fee_option_id === '1072').map(persisted);
  assert.deepEqual(event.new_values, feeSnapshot(current));
  const changedFee = { ...current, amount: '25000.00' };
  assert.equal(project(changedFee, [event], state), 'source_supported');
  // The planner recognises the stale event and requires a fresh one for the changed snapshot.
  const changedState = { ...state, fees: state.fees.map((item) => (item.id === '1072' ? { ...item, amount: '20000.00', label: 'Registration of Business Name' } : item)), events: [{ ...event, new_values: { ...event.new_values, amount: '15000.00' } }] };
  assert.ok(planCacFeaturedReconciliation(changedState).eventsToCreate.some((item) => item.fee_option_id === '1072'));
});

test('a review of a superseded fee cannot verify the current claim', () => {
  const state = fixture();
  const superseded = state.fees.find((item) => item.id === '1078');
  const supersededEvent = persisted({
    service_id: '243', fee_option_id: '1078', source_id: '57', status: 'verified', checked_at: reviewedAt,
    checked_by: 'Amadi', actor_admin_user_id: '1', evidence_summary: 'Old formula.', verification_method: 'Old review.',
    new_values: feeSnapshot(superseded),
  }, 900);
  const current = state.fees.find((item) => item.id === '1272');
  assert.equal(project(current, [{ ...supersededEvent, fee_option_id: '1272' }], state), 'source_supported');
  assert.equal(project(superseded, [supersededEvent], state), 'historical_or_superseded');
  const plan = planCacFeaturedReconciliation({ ...state, events: [supersededEvent] });
  assert.ok(plan.eventsToCreate.some((item) => item.fee_option_id === '1272'));
});

test('reviewer identity is required', () => {
  const state = fixture();
  const noReviewer = planCacFeaturedReconciliation({ ...state, reviewer: null });
  assert.ok(noReviewer.summary.errors.some((error) => /reviewer/i.test(error)));
  assert.equal(noReviewer.eventsToCreate.length, 0);
  const inactive = planCacFeaturedReconciliation({ ...state, reviewer: { ...reviewer, is_active: false } });
  assert.ok(inactive.summary.errors.length > 0);
  const [event] = planCacFeaturedReconciliation(state).eventsToCreate.map(persisted);
  const target = state.fees.find((item) => item.id === event.fee_option_id);
  assert.equal(project(target, [{ ...event, actor_admin_user_id: null, reviewer_role: null, reviewer_display_name: null }], state), 'source_supported');
  assert.equal(project(target, [{ ...event, reviewer_display_name: 'Someone Else' }], state), 'source_supported');
});

test('a linked authoritative CAC source is required', () => {
  const state = fixture();
  const unlinked = { ...state, feeSources: state.feeSources.filter((link) => link.fee_option_id !== '1074') };
  const plan = planCacFeaturedReconciliation(unlinked);
  assert.ok(plan.summary.errors.some((error) => error.includes('1074') && /evidence link/.test(error)));
  assert.equal(plan.summary.missingSourceLinks, 1);
  const [event] = planCacFeaturedReconciliation(state).eventsToCreate.filter((item) => item.fee_option_id === '1074').map(persisted);
  assert.equal(project(state.fees.find((item) => item.id === '1074'), [event], unlinked), 'pending');
});

test('evidence summary, review method and evidence locator are required', () => {
  const state = fixture();
  const [event] = planCacFeaturedReconciliation(state).eventsToCreate.map(persisted);
  const target = state.fees.find((item) => item.id === event.fee_option_id);
  assert.equal(project(target, [{ ...event, evidence_summary: ' ' }], state), 'source_supported');
  assert.equal(project(target, [{ ...event, verification_method: '' }], state), 'source_supported');
  assert.equal(project(target, [{ ...event, checked_at: null }], state), 'source_supported');
  const noLocator = { ...state, feeSources: state.feeSources.map((link) => (link.fee_option_id === '1075' ? { ...link, page_or_section: null } : link)) };
  assert.ok(planCacFeaturedReconciliation(noLocator).summary.errors.some((error) => error.includes('1075')));
});

test('reconciliation is idempotent: existing valid events are recognised and not duplicated', () => {
  const state = fixture();
  const first = planCacFeaturedReconciliation(state);
  const second = planCacFeaturedReconciliation({ ...state, events: first.eventsToCreate.map(persisted) });
  assert.equal(second.eventsToCreate.length, 0);
  assert.equal(second.summary.alreadyVerified, 12);
  assert.deepEqual(second.summary.errors, []);
});

test('all approved CAC Featured services project as verified after reconciliation with legacy fees superseded', () => {
  const state = fixture();
  const plan = planCacFeaturedReconciliation({ ...state, supersedeUnapproved: true });
  assert.deepEqual(plan.summary.errors, []);
  assert.deepEqual(plan.feesToSupersede.map((item) => item.feeOptionId).sort(), ['19', '20']);
  assert.equal(plan.summary.warnings.length, 0);
  const supersededIds = new Set(plan.feesToSupersede.map((item) => item.feeOptionId));
  const afterFees = state.fees.map((item) => (supersededIds.has(item.id) ? { ...item, is_current: false, verification_status: 'superseded' } : item));
  const events = plan.eventsToCreate.map(persisted);
  for (const service of state.services) {
    const current = afterFees.filter((item) => item.service_id === service.id && item.is_current && item.verification_status !== 'superseded');
    assert.ok(current.length > 0, service.slug);
    for (const item of current) assert.equal(project(item, events, state), 'verified', `${service.slug} fee ${item.id}`);
  }
  for (const id of ['19', '20', '1078']) assert.equal(project(afterFees.find((item) => item.id === id), events, state), 'historical_or_superseded');
  assert.ok(plan.services.every((service) => service.expectedServiceStatus === 'verified'));
});

test('a fee that no longer matches the approved claim blocks the reconciliation', () => {
  const state = fixture();
  const drifted = { ...state, fees: state.fees.map((item) => (item.id === '1081' ? { ...item, amount: '25000.00' } : item)) };
  const plan = planCacFeaturedReconciliation(drifted);
  assert.ok(plan.summary.errors.some((error) => error.includes('cac-014')));
});

test('NIMC and NIPC verification behaviour is unchanged by the CAC reconciliation', () => {
  const nimcFee = { id: '500', service_id: '50', pricing_model: 'fixed', currency: 'NGN', amount: '5000.00', min_amount: null, max_amount: null, percentage: null, formula: null, conditions: null, label: 'Date of birth modification', is_current: true, verification_status: 'verified' };
  const nimcEvent = { fee_option_id: '500', service_id: '50', status: 'verified', actor_admin_user_id: '1', reviewer_role: 'admin', reviewer_display_name: 'Amadi', checked_by: 'Amadi', checked_at: '2026-11-02T00:00:00.000Z', source_id: '40', evidence_summary: 'NIMC SLA section.', verification_method: 'Direct comparison with the authoritative NIMC SLA.', new_values: feeSnapshot(nimcFee) };
  assert.equal(hasValidPublicReview({ feeOption: nimcFee, reviewEvents: [nimcEvent], linkedSources: [{ id: '40', source_type: 'service_level_agreement' }] }), true);
  assert.equal(projectPublicFeeStatus({ feeOption: nimcFee, reviewEvents: [], linkedSources: [{ id: '40', source_type: 'service_level_agreement' }] }), 'source_supported');
  // The reconciliation is scoped to CAC and to the approved slugs only.
  const script = fs.readFileSync(path.join(__dirname, '../scripts/reconcile-cac-featured-verification.js'), 'utf8');
  assert.match(script, /const CAC_MDA_SLUG = 'cac';/);
  assert.doesNotMatch(script, /'nimc'|'nipc'/);
  assert.doesNotMatch(script, /\bDELETE\s+FROM\b|\bTRUNCATE\b/i);
  assert.doesNotMatch(script, /UPDATE\s+(services|sources|fee_sources|verification_events)\b/i);
  // The public projection still requires a reviewer-backed event; it was not weakened.
  const sql = publicFeeStatusSql('f');
  assert.match(sql, /reviewer\.role = 'admin'/);
  assert.match(sql, /review_source\.fee_option_id = f\.id/);
  assert.doesNotMatch(sql, /cac/i);
});

test('argument parsing defaults to dry run', () => {
  assert.deepEqual(parseArguments([]), { apply: false, supersedeUnapproved: false });
  assert.deepEqual(parseArguments(['--apply', '--supersede-unapproved']), { apply: true, supersedeUnapproved: true });
  assert.throws(() => parseArguments(['--force']));
});
