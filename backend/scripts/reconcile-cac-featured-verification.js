#!/usr/bin/env node
/*
 * Focused CAC Featured Services verification reconciliation.
 *
 * Records the project owner's explicit human review of the ten approved CAC
 * Featured Services against the authoritative CAC Service Level Agreement by
 * creating reviewer-backed verification events for the exact current fee
 * claims. It does not change the public verification rules, does not touch
 * services, fee values, sources or evidence links, and does not verify any of
 * the other CAC services.
 *
 * Usage (from backend/):
 *   REVIEWER_ADMIN_ID=<id> node scripts/reconcile-cac-featured-verification.js            # dry run (default)
 *   REVIEWER_ADMIN_ID=<id> node scripts/reconcile-cac-featured-verification.js --apply
 *   ... --supersede-unapproved   # also retire current non-approved fee options on the ten
 *                                # featured services (non-destructive: is_current=false,
 *                                # verification_status='superseded', audit logged)
 */
const { hasValidPublicReview, publicFeeStatusSql } = require('../src/services/public-verification');

const SNAPSHOT_FIELDS = [
  'id', 'service_id', 'pricing_model', 'currency', 'amount', 'min_amount', 'max_amount',
  'percentage', 'formula', 'conditions', 'label', 'is_current', 'verification_status',
];

const CAC_MDA_SLUG = 'cac';
const REVIEW_SOURCE = Object.freeze({
  sourceType: 'service_level_agreement',
  publisher: 'Corporate Affairs Commission',
  titleIncludes: 'Service Level Agreement',
});
const VERIFICATION_METHOD = 'Project-owner human review: the fee, service and conditions were compared directly with the authoritative CAC Service Level Agreement supplied by the project owner; the fee-specific PDF page and excerpt are recorded in the fee evidence link; explicitly approved for publication.';
const REVIEW_NOTES = 'CAC Featured Services verification reconciliation: records the explicit project-owner review and approval of the supplied CAC Service Level Agreement for this current fee claim.';

const normalizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const amountEquals = (value, expected) => value !== null && value !== undefined && Number(value) === expected;

function fixedClaim(label, amount) {
  return {
    description: `${label}: ₦${amount.toLocaleString('en-NG')}`,
    matches: (fee) => fee.pricing_model === 'fixed' && fee.currency === 'NGN'
      && amountEquals(fee.amount, amount) && normalizeText(fee.label) === normalizeText(label),
  };
}

// The approved, reviewed claims for the ten CAC Featured Services.
const APPROVED_CAC_FEATURED_CLAIMS = Object.freeze([
  { slug: 'business-name-registration-ctc-registration-documents', name: 'Registration of Business Name', claims: [fixedClaim('Registration of Business Name', 20_000)] },
  {
    slug: 'company-with-share-capital-small-private-other-than-small',
    name: 'Registration of Company',
    claims: [{
      description: 'Registration of Company: ₦10,000 per ₦1,000,000 or part thereof (Small/Other); ₦20,000 per ₦1,000,000 or part thereof (Public); stamp duty 0.75% of share capital (limited by shares) / ₦1,000 (limited by guarantee)',
      matches: (fee) => {
        const formula = normalizeText(fee.formula);
        const notes = normalizeText(fee.notes);
        return fee.pricing_model === 'formula' && fee.currency === 'NGN' && fee.amount === null
          && normalizeText(fee.label) === 'registration of company'
          && formula.includes('10,000 for every n 1,000,000 or part thereof (small and other than small companies)')
          && formula.includes('20,000 for every n 1,000,000 or part thereof (public companies)')
          && notes.includes('0.75% of the total value of the share capital')
          && notes.includes('1,000 naira in the case of a company limited by guarantee');
      },
    }],
  },
  { slug: 'cac-007-incorporation-of-incorporated-trustees', name: 'Incorporation of Incorporated Trustees', claims: [fixedClaim('Incorporation of Incorporated Trustees', 40_000)] },
  { slug: 'cac-008-registration-of-limited-partnership', name: 'Registration of Limited Partnership', claims: [fixedClaim('Registration of Limited Partnership', 30_000)] },
  { slug: 'cac-009-registration-of-limited-liability-partnership', name: 'Registration of Limited Liability Partnership', claims: [fixedClaim('Registration of Limited Liability Partnership', 40_000)] },
  { slug: 'cac-010-change-of-name-business-name', name: 'Change of Name — Business Name', claims: [fixedClaim('Change of Name — Business Name', 10_000)] },
  {
    slug: 'cac-011-change-of-name-company',
    name: 'Change of Name — Company',
    claims: [
      fixedClaim('Small Company', 10_000),
      fixedClaim('Company other than Small Company and LTD/GTE', 20_000),
      fixedClaim('Public Company', 50_000),
    ],
  },
  { slug: 'cac-012-change-of-name-incorporated-trustees', name: 'Change of Name — Incorporated Trustees', claims: [fixedClaim('Change of Name — Incorporated Trustees', 25_000)] },
  { slug: 'cac-013-change-of-name-limited-partnership', name: 'Change of Name — Limited Partnership', claims: [fixedClaim('Change of Name — Limited Partnership', 10_000)] },
  { slug: 'cac-014-change-of-name-limited-liability-partnership', name: 'Change of Name — Limited Liability Partnership', claims: [fixedClaim('Change of Name — Limited Liability Partnership', 20_000)] },
]);

const APPROVED_CLAIM_COUNT = APPROVED_CAC_FEATURED_CLAIMS.reduce((total, service) => total + service.claims.length, 0);

function feeSnapshot(fee) {
  return Object.fromEntries(SNAPSHOT_FIELDS.map((field) => [field, fee[field] ?? null]));
}

function isReviewSource(source) {
  return Boolean(source)
    && source.source_type === REVIEW_SOURCE.sourceType
    && source.publisher === REVIEW_SOURCE.publisher
    && String(source.title || '').includes(REVIEW_SOURCE.titleIncludes)
    && String(source.url || '').trim() !== '';
}

function isCurrentFee(fee) {
  return fee.is_current === true && fee.verification_status !== 'superseded';
}

/**
 * Pure planning step. Given the loaded database state, decide which reviewer-backed
 * verification events are required, which already exist, and whether anything blocks
 * the reconciliation. Performs no I/O.
 */
function planCacFeaturedReconciliation({ services = [], fees = [], feeSources = [], sources = [], events = [], reviewer, reviewedAt, supersedeUnapproved = false }) {
  const errors = [];
  const warnings = [];
  const eventsToCreate = [];
  const feesToSupersede = [];
  const serviceReports = [];
  const sourceById = new Map(sources.map((source) => [String(source.id), source]));
  const reviewSourceIds = new Set();
  let alreadyVerified = 0;
  let sourceSupported = 0;
  let missingSourceLinks = 0;
  let missingEvidenceMetadata = 0;
  let duplicateEventRisks = 0;

  if (!reviewer) errors.push('An active authorised administrator/reviewer is required.');
  else if (reviewer.role !== 'admin' || reviewer.is_active !== true || String(reviewer.display_name || '').trim() === '') {
    errors.push(`Reviewer ${reviewer.id} is not an active administrator with a display name.`);
  }

  for (const approved of APPROVED_CAC_FEATURED_CLAIMS) {
    const matchingServices = services.filter((service) => service.slug === approved.slug);
    const report = { slug: approved.slug, name: approved.name, serviceId: null, feeOptions: [], unapprovedCurrentFees: [], expectedServiceStatus: 'verified' };
    serviceReports.push(report);
    if (matchingServices.length !== 1) {
      errors.push(`${approved.slug}: expected exactly one CAC service, found ${matchingServices.length}.`);
      continue;
    }
    const service = matchingServices[0];
    report.serviceId = String(service.id);
    if (service.is_active !== true) errors.push(`${approved.slug}: service is not active.`);
    if (!['registration', 'change_of_name'].includes(service.catalogue_group)) errors.push(`${approved.slug}: service is not in a Featured catalogue group.`);

    const currentFees = fees.filter((fee) => String(fee.service_id) === String(service.id) && isCurrentFee(fee));
    const matchedFeeIds = new Set();

    for (const claim of approved.claims) {
      const matches = currentFees.filter((fee) => claim.matches(fee));
      if (matches.length !== 1) {
        errors.push(`${approved.slug}: expected exactly one current fee option for "${claim.description}", found ${matches.length}.`);
        continue;
      }
      const fee = matches[0];
      matchedFeeIds.add(String(fee.id));
      const links = feeSources.filter((link) => String(link.fee_option_id) === String(fee.id));
      const reviewLinks = links.filter((link) => isReviewSource(sourceById.get(String(link.source_id))));
      const feeEvents = events.filter((event) => String(event.fee_option_id) === String(fee.id));
      const linkedSources = links.map((link) => sourceById.get(String(link.source_id))).filter(Boolean);
      const validEvents = feeEvents.filter((event) => hasValidPublicReview({ feeOption: fee, reviewEvents: [event], linkedSources }));
      const feeReport = {
        feeOptionId: String(fee.id),
        claim: claim.description,
        storedStatus: fee.verification_status,
        currentPublicStatus: fee.public_status ?? null,
        sourceLinkPresent: reviewLinks.length > 0,
        sourceId: reviewLinks[0] ? String(reviewLinks[0].source_id) : null,
        pageOrSection: reviewLinks[0]?.page_or_section ?? null,
        validReviewerEventPresent: validEvents.length > 0,
        verificationEventRequired: false,
        expectedFinalStatus: 'verified',
      };
      report.feeOptions.push(feeReport);

      if (fee.verification_status !== 'verified') errors.push(`${approved.slug} fee ${fee.id}: stored status is ${fee.verification_status}; only stored-verified current claims can be projected as verified.`);
      if (!reviewLinks.length) {
        missingSourceLinks += 1;
        errors.push(`${approved.slug} fee ${fee.id}: no evidence link to the authoritative CAC Service Level Agreement.`);
        continue;
      }
      if (reviewLinks.length > 1) errors.push(`${approved.slug} fee ${fee.id}: linked to more than one CAC SLA source record.`);
      const link = reviewLinks[0];
      reviewSourceIds.add(String(link.source_id));
      if (String(link.page_or_section || '').trim() === '' || String(link.excerpt || '').trim() === '') {
        missingEvidenceMetadata += 1;
        errors.push(`${approved.slug} fee ${fee.id}: evidence link is missing its page/section or excerpt.`);
      }
      if (link.is_primary !== true) warnings.push(`${approved.slug} fee ${fee.id}: CAC SLA evidence link is not marked primary.`);

      if (validEvents.length) {
        alreadyVerified += 1;
        if (validEvents.length > 1) {
          duplicateEventRisks += 1;
          warnings.push(`${approved.slug} fee ${fee.id}: ${validEvents.length} valid reviewer-backed events already exist; no further event will be created.`);
        }
        continue;
      }
      sourceSupported += 1;
      feeReport.verificationEventRequired = true;
      if (reviewer) {
        const source = sourceById.get(String(link.source_id));
        eventsToCreate.push({
          service_id: String(fee.service_id),
          fee_option_id: String(fee.id),
          source_id: String(link.source_id),
          status: 'verified',
          checked_at: reviewedAt,
          checked_by: reviewer.display_name,
          actor_admin_user_id: String(reviewer.id),
          notes: REVIEW_NOTES,
          evidence_summary: `${source.title}, ${String(link.page_or_section).trim()}: ${String(link.excerpt).replace(/\s+/g, ' ').trim()}`,
          verification_method: VERIFICATION_METHOD,
          previous_values: {
            publicStatus: fee.public_status ?? 'source_supported',
            reviewerBackedEvent: false,
            priorEventIds: feeEvents.map((event) => String(event.id)),
          },
          new_values: feeSnapshot(fee),
        });
      }
    }

    for (const fee of currentFees.filter((candidate) => !matchedFeeIds.has(String(candidate.id)))) {
      const summary = { feeOptionId: String(fee.id), label: fee.label, pricingModel: fee.pricing_model, amount: fee.amount, formula: fee.formula, currentPublicStatus: fee.public_status ?? null };
      report.unapprovedCurrentFees.push(summary);
      if (supersedeUnapproved) {
        feesToSupersede.push({ ...summary, serviceId: String(fee.service_id), slug: approved.slug, before: fee });
      } else {
        report.expectedServiceStatus = fee.public_status === 'verified' ? report.expectedServiceStatus : (fee.public_status || 'source_supported');
        warnings.push(`${approved.slug}: current fee option ${fee.id} ("${fee.label}") is outside the approved reviewed scope and will remain ${fee.public_status || 'unverified'}, keeping the service-level status at ${report.expectedServiceStatus}.`);
      }
    }
  }

  if (reviewSourceIds.size > 1) errors.push(`Approved claims reference ${reviewSourceIds.size} different CAC SLA source records; expected one reused source.`);

  return {
    featuredServices: serviceReports.length,
    approvedClaims: APPROVED_CLAIM_COUNT,
    services: serviceReports,
    summary: {
      alreadyVerified,
      sourceSupported,
      newVerificationEventsRequired: eventsToCreate.length,
      unapprovedFeesToSupersede: feesToSupersede.length,
      duplicateEventRisks,
      missingSourceLinks,
      missingEvidenceMetadata,
      reviewSourceIds: [...reviewSourceIds],
      warnings,
      errors,
      writesExpected: eventsToCreate.length * 2 + feesToSupersede.length * 2,
    },
    eventsToCreate,
    feesToSupersede,
  };
}

async function loadState(client, reviewerAdminId) {
  const statusSql = publicFeeStatusSql('f');
  const slugs = APPROVED_CAC_FEATURED_CLAIMS.map((service) => service.slug);
  const services = (await client.query(
    `SELECT s.id, s.slug, s.name, s.catalogue_group, s.is_active
       FROM services s JOIN mdas m ON m.id = s.mda_id
      WHERE m.slug = $1 AND s.slug = ANY($2::text[])
      ORDER BY s.id`, [CAC_MDA_SLUG, slugs])).rows;
  const serviceIds = services.map((service) => service.id);
  const fees = (await client.query(
    `SELECT f.*, (${statusSql}) AS public_status
       FROM fee_options f WHERE f.service_id = ANY($1::bigint[]) ORDER BY f.id`, [serviceIds])).rows;
  const feeIds = fees.map((fee) => fee.id);
  const feeSources = (await client.query(
    'SELECT * FROM fee_sources WHERE fee_option_id = ANY($1::bigint[]) ORDER BY fee_option_id, source_id', [feeIds])).rows;
  const sources = (await client.query(
    'SELECT * FROM sources WHERE id = ANY($1::bigint[]) ORDER BY id', [[...new Set(feeSources.map((link) => link.source_id))]])).rows;
  const events = (await client.query(
    `SELECT ve.*, reviewer.role AS reviewer_role, reviewer.display_name AS reviewer_display_name
       FROM verification_events ve
       LEFT JOIN admin_users reviewer ON reviewer.id = ve.actor_admin_user_id
      WHERE ve.fee_option_id = ANY($1::bigint[]) ORDER BY ve.id`, [feeIds])).rows;
  const reviewer = reviewerAdminId
    ? (await client.query('SELECT id, display_name, role, is_active FROM admin_users WHERE id = $1', [reviewerAdminId])).rows[0] || null
    : null;
  return { services, fees, feeSources, sources, events, reviewer };
}

async function audit(client, actorAdminUserId, action, entityType, entityId, oldValues, newValues) {
  await client.query(
    `INSERT INTO audit_logs (actor_admin_user_id, action, entity_type, entity_id, old_values, new_values)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [actorAdminUserId, action, entityType, String(entityId), oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null],
  );
}

async function applyPlan(client, plan, reviewer) {
  const createdEventIds = [];
  for (const fee of plan.feesToSupersede) {
    const updated = (await client.query(
      `UPDATE fee_options SET is_current = FALSE, verification_status = 'superseded', updated_at = NOW()
        WHERE id = $1 AND is_current = TRUE RETURNING *`, [fee.feeOptionId])).rows[0];
    if (!updated) throw new Error(`Fee option ${fee.feeOptionId} changed during reconciliation.`);
    const { public_status: _ignored, ...before } = fee.before;
    await audit(client, reviewer.id, 'cac.fee.superseded_outside_reviewed_scope', 'fee_option', fee.feeOptionId, before,
      { ...updated, reason: 'Legacy fee record outside the project-owner reviewed CAC SLA scope for this Featured Service; retained as history.' });
  }
  for (const event of plan.eventsToCreate) {
    const inserted = (await client.query(
      `INSERT INTO verification_events
         (service_id, fee_option_id, source_id, status, checked_at, checked_by, notes, actor_admin_user_id,
          evidence_summary, verification_method, previous_values, new_values)
       VALUES ($1, $2, $3, 'verified', $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb) RETURNING id`,
      [event.service_id, event.fee_option_id, event.source_id, event.checked_at, event.checked_by, event.notes,
        event.actor_admin_user_id, event.evidence_summary, event.verification_method,
        JSON.stringify(event.previous_values), JSON.stringify(event.new_values)])).rows[0];
    createdEventIds.push(String(inserted.id));
    await audit(client, reviewer.id, 'cac.verification.reviewed', 'verification_event', inserted.id, null,
      { ...event.new_values, sourceId: event.source_id, status: 'verified', checkedAt: event.checked_at, checkedBy: event.checked_by });
  }
  return createdEventIds;
}

function parseArguments(argv) {
  const options = { apply: false, supersedeUnapproved: false };
  for (const argument of argv) {
    if (argument === '--apply') options.apply = true;
    else if (argument === '--dry-run') options.apply = false;
    else if (argument === '--supersede-unapproved') options.supersedeUnapproved = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const reviewerAdminId = process.env.REVIEWER_ADMIN_ID ? Number(process.env.REVIEWER_ADMIN_ID) : null;
  if (reviewerAdminId !== null && (!Number.isInteger(reviewerAdminId) || reviewerAdminId < 1)) throw new Error('REVIEWER_ADMIN_ID must be a positive integer.');
  const { getPool, closePool } = require('../src/db/pool');
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reviewedAt = new Date().toISOString();
    if (options.apply) {
      await client.query(`SELECT f.id FROM fee_options f JOIN services s ON s.id = f.service_id JOIN mdas m ON m.id = s.mda_id
                           WHERE m.slug = $1 AND s.slug = ANY($2::text[]) FOR UPDATE OF f`, [CAC_MDA_SLUG, APPROVED_CAC_FEATURED_CLAIMS.map((s) => s.slug)]);
    }
    const state = await loadState(client, reviewerAdminId);
    const plan = planCacFeaturedReconciliation({ ...state, reviewedAt, supersedeUnapproved: options.supersedeUnapproved });
    const report = { mode: options.apply ? 'apply' : 'dry-run', reviewer: state.reviewer ? { id: String(state.reviewer.id), displayName: state.reviewer.display_name } : null, ...plan, writes: 0 };
    delete report.feesToSupersede;
    report.feesToSupersede = plan.feesToSupersede.map(({ before: _before, ...rest }) => rest);
    if (!options.apply || plan.summary.errors.length) {
      await client.query('ROLLBACK');
      console.log(JSON.stringify(report, null, 2));
      if (plan.summary.errors.length) process.exitCode = 1;
      return;
    }
    const createdEventIds = await applyPlan(client, plan, state.reviewer);
    const after = await loadState(client, reviewerAdminId);
    const verifyPlan = planCacFeaturedReconciliation({ ...after, reviewedAt, supersedeUnapproved: false });
    const notVerified = verifyPlan.services.flatMap((service) => service.feeOptions).filter((fee) => fee.currentPublicStatus !== 'verified');
    if (verifyPlan.summary.errors.length || verifyPlan.eventsToCreate.length || notVerified.length) {
      throw new Error(`Post-apply verification failed; rolled back. ${JSON.stringify({ errors: verifyPlan.summary.errors, notVerified })}`);
    }
    await client.query('COMMIT');
    console.log(JSON.stringify({ ...report, createdEventIds, writes: plan.summary.writesExpected, postApply: verifyPlan.services }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await closePool();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  APPROVED_CAC_FEATURED_CLAIMS,
  APPROVED_CLAIM_COUNT,
  VERIFICATION_METHOD,
  feeSnapshot,
  parseArguments,
  planCacFeaturedReconciliation,
};
