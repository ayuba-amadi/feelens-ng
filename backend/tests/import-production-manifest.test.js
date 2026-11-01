const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../../research/production-import/batch-01-mdas.json');
const batch2Manifest = require('../../research/production-import/batch-02-mdas.json');
const batch3Manifest = require('../../research/production-import/batch-03-mdas.json');
const {
  BATCH_02_SLUGS,
  BATCH_03_SLUGS,
  DEFAULT_MANIFEST_PATH,
  FRSC_CATALOGUE_PATH,
  buildFrscManifest,
  dryRunReport,
  importBatch,
  loadManifest,
  selectBatch,
  validateManifest,
} = require('../scripts/import-production-manifest');
const frscCatalogue = require('../../research/production-import/frsc-service-catalogue.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fakePool() {
  const state = {
    mdas: [], services: [], sources: [], fees: [], feeSources: [], channels: [], verifications: [], audits: [],
    ids: { mdas: 0, services: 0, sources: 0, fees: 0, channels: 0, verifications: 0 },
  };
  const nextId = (table) => { state.ids[table] += 1; return state.ids[table]; };
  const client = {
    async query(rawSql, values = []) {
      const sql = rawSql.trim();
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
      if (sql.startsWith('INSERT INTO audit_logs')) {
        state.audits.push({ action: values[1], entityType: values[2], entityId: values[3], oldValues: values[4], newValues: values[5] });
        return { rows: [] };
      }
      if (sql.startsWith('SELECT * FROM mdas')) return { rows: state.mdas.filter((row) => row.slug === values[0]).map(clone) };
      if (sql.startsWith('INSERT INTO mdas')) {
        const row = { id: nextId('mdas'), name: values[0], slug: values[1], acronym: values[2], description: values[3], website_url: values[4], coverage_status: values[5], is_active: values[6], jurisdiction: values[7] ?? null };
        state.mdas.push(row); return { rows: [clone(row)] };
      }
      if (sql.startsWith('UPDATE mdas')) {
        const hasJurisdiction = sql.includes('jurisdiction=$7');
        const row = state.mdas.find((item) => item.id === values[hasJurisdiction ? 7 : 6]);
        Object.assign(row, { name: values[0], acronym: values[1], description: values[2], website_url: values[3], coverage_status: values[4], is_active: values[5] });
        if (hasJurisdiction) row.jurisdiction = values[6];
        return { rows: [clone(row)] };
      }
      if (sql.startsWith('SELECT * FROM services')) return { rows: state.services.filter((row) => row.mda_id === values[0] && row.slug === values[1]).map(clone) };
      if (sql.startsWith('INSERT INTO services')) {
        const row = { id: nextId('services'), mda_id: values[0], name: values[1], slug: values[2], description: values[3], category: values[4], jurisdiction: values[5], requirements: JSON.parse(values[6]), process_steps: JSON.parse(values[7]), notes: values[8], is_active: values[9] };
        state.services.push(row); return { rows: [clone(row)] };
      }
      if (sql.startsWith('UPDATE services')) {
        const row = state.services.find((item) => item.id === values[7]);
        Object.assign(row, { name: values[0], description: values[1], category: values[2], jurisdiction: values[3], requirements: JSON.parse(values[4]), process_steps: JSON.parse(values[5]), notes: values[6], is_active: true });
        return { rows: [clone(row)] };
      }
      if (sql.startsWith('SELECT * FROM sources')) return { rows: state.sources.filter((row) => row.title === values[0] && row.source_type === values[1] && row.url === values[2]).map(clone) };
      if (sql.startsWith('INSERT INTO sources')) {
        const row = { id: nextId('sources'), title: values[0], source_type: values[1], evidence_tier: values[2], publisher: values[3], url: values[4], publication_date: values[6], effective_date: values[7], accessed_at: values[8], notes: values[9] };
        state.sources.push(row); return { rows: [clone(row)] };
      }
      if (sql.startsWith('SELECT * FROM fee_options')) {
        const row = state.fees.find((item) => item.service_id === values[0] && item.pricing_model === values[1] && item.currency === values[2]
          && item.amount === values[3] && item.min_amount === values[4] && item.max_amount === values[5]
          && item.percentage === values[6] && item.formula === values[7] && item.conditions === values[8]
          && item.label === values[9] && item.notes === values[10] && item.is_current === values[11]
          && item.verification_status === values[12]);
        return { rows: row ? [clone(row)] : [] };
      }
      if (sql.startsWith('INSERT INTO fee_options')) {
        const row = { id: nextId('fees'), service_id: values[0], pricing_model: values[1], currency: values[2], amount: values[3], min_amount: values[4], max_amount: values[5], percentage: values[6], formula: values[7], conditions: values[8], label: values[9], notes: values[10], is_current: values[11], verification_status: values[12], verified_at: values[13], next_review_at: values[14] };
        state.fees.push(row); return { rows: [clone(row)] };
      }
      if (sql.startsWith('INSERT INTO fee_sources')) {
        const exists = state.feeSources.some((item) => item.fee_option_id === values[0] && item.source_id === values[1]);
        if (exists) return { rows: [] };
        const row = { fee_option_id: values[0], source_id: values[1], excerpt: values[2], is_primary: values[4] };
        state.feeSources.push(row); return { rows: [{ feeOptionId: row.fee_option_id, sourceId: row.source_id, excerpt: row.excerpt, isPrimary: row.is_primary }] };
      }
      if (sql.startsWith('SELECT id FROM verification_events')) {
        const row = state.verifications.find((item) => item.service_id === values[0] && item.fee_option_id === values[1] && item.status === values[2] && item.checked_at === values[3] && item.evidence_summary === values[4] && item.verification_method === values[5]);
        return { rows: row ? [{ id: row.id }] : [] };
      }
      if (sql.startsWith('INSERT INTO verification_events')) {
        const row = { id: nextId('verifications'), service_id: values[0], fee_option_id: values[1], source_id: values[2], status: values[3], checked_at: values[4], evidence_summary: values[8], verification_method: values[9] };
        state.verifications.push(row); return { rows: [clone(row)] };
      }
      if (sql.startsWith('SELECT * FROM official_channels')) {
        const row = state.channels.find((item) => (item.mda_id ?? null) === values[0] && (item.service_id ?? null) === values[1] && item.channel_type === values[2] && item.name === values[3] && item.url === values[4] && (item.contact_value ?? null) === values[5]);
        return { rows: row ? [clone(row)] : [] };
      }
      if (sql.startsWith('INSERT INTO official_channels')) {
        const row = { id: nextId('channels'), service_id: values[0], mda_id: values[1], channel_type: values[2], name: values[3], url: values[4], contact_value: values[5], instructions: values[6], is_active: values[7] };
        state.channels.push(row); return { rows: [clone(row)] };
      }
      if (sql.startsWith('UPDATE official_channels')) {
        const row = state.channels.find((item) => item.id === values[1]);
        Object.assign(row, { instructions: values[0], is_active: true });
        return { rows: [clone(row)] };
      }
      throw new Error(`Unhandled SQL: ${sql}`);
    },
    release() {},
  };
  return { state, connect: async () => client };
}

test('Batch 1 manifest validates and has the expected research shape', () => {
  const validated = validateManifest(manifest);
  const report = dryRunReport(validated, 'batch-01');
  assert.equal(report.mdaCount, 5);
  assert.equal(report.serviceCount, 25);
  assert.equal(report.feeOptionCount, 25);
  assert.equal(report.uniqueEvidenceCount, 9);
  assert.equal(report.verifiedCount, 24);
  assert.equal(report.conflictingCount, 1);
  assert.equal(report.duplicateRiskCount, 0);
});

test('Batch 1 filtering excludes non-Batch-1 records', () => {
  const extra = { ...manifest.mdas[0], slug: 'batch-02-example', name: 'Excluded example MDA' };
  const selected = selectBatch(validateManifest({ ...manifest, mdas: [...manifest.mdas, extra] }), 'batch-01');
  assert.equal(selected.mdas.length, 5);
  assert.deepEqual(selected.excludedMdas, ['batch-02-example']);
});

test('Batch 1, Batch 2 and Batch 3 filters are isolated and each batch has exactly five MDAs', () => {
  const batch1 = selectBatch(validateManifest(manifest), 'batch-01');
  const batch2 = selectBatch(validateManifest(batch2Manifest), 'batch-02');
  const batch3 = selectBatch(validateManifest(batch3Manifest), 'batch-03');
  assert.deepEqual(batch1.mdas.map((mda) => mda.slug), ['fct-irs', 'nimc', 'nigeria-immigration-service', 'frsc-drivers-licence', 'cac']);
  assert.deepEqual(batch2.mdas.map((mda) => mda.slug), BATCH_02_SLUGS);
  assert.deepEqual(batch3.mdas.map((mda) => mda.slug), BATCH_03_SLUGS);
  assert.equal(batch2.mdas.length, 5);
  assert.equal(batch3.mdas.length, 5);
  assert.throws(() => selectBatch(validateManifest(manifest), 'batch-02'), /batch-02 requires exactly/);
  assert.throws(() => selectBatch(validateManifest(batch2Manifest), 'batch-01'), /batch-01 requires exactly/);
  assert.throws(() => selectBatch(validateManifest(manifest), 'batch-03'), /batch-03 requires exactly/);
  assert.throws(() => selectBatch(validateManifest(batch2Manifest), 'batch-03'), /batch-03 requires exactly/);
  assert.throws(() => selectBatch(validateManifest(batch3Manifest), 'batch-01'), /batch-01 requires exactly/);
  assert.throws(() => selectBatch(validateManifest(batch3Manifest), 'batch-02'), /batch-02 requires exactly/);
});

test('Batch 2 manifest validates free, USD, percentage, formula and conflicting semantics', () => {
  const validated = validateManifest(batch2Manifest);
  const report = dryRunReport(validated, 'batch-02');
  const allServices = validated.mdas.flatMap((mda) => mda.services);
  assert.equal(report.mdaCount, 5);
  assert.equal(report.serviceCount, 22);
  assert.equal(report.feeOptionCount, 22);
  assert.equal(report.verifiedCount, 21);
  assert.equal(report.conflictingCount, 1);
  assert.equal(report.pendingCount, 0);
  assert.equal(report.uniqueEvidenceCount, 11);
  assert.equal(report.officialChannelCount, 21);
  assert.equal(report.duplicateRiskCount, 0);
  assert.equal(report.writes, 0);
  assert.equal(report.validationWarnings.some((warning) => warning.includes('jamb/printing-of-result-slip')), false);
  assert.equal(allServices.find((service) => service.slug === 'birth-registration-child-under-5-npc-registration-centre').amount, null);
  assert.equal(allServices.find((service) => service.slug === 'online-self-service-birth-registration').currency, 'USD');
  assert.equal(allServices.find((service) => service.slug === 'deed-of-assignment-gift').percentage, 8);
  assert.match(allServices.find((service) => service.slug === 'power-of-attorney-registration').formula, /extra copy/);
  assert.equal(allServices.find((service) => service.slug === 'printing-of-result-slip').verificationStatus, 'conflicting');
  assert.equal(allServices.find((service) => service.slug === 'printing-of-result-slip').evidence.length, 2);
});

test('Batch 3 manifest validates pending, USD, variable and shared-evidence semantics', () => {
  const validated = validateManifest(batch3Manifest);
  const report = dryRunReport(validated, 'batch-03');
  const allServices = validated.mdas.flatMap((mda) => mda.services);
  const nafdacServices = validated.mdas.find((mda) => mda.slug === 'nafdac').services;
  const sonServices = validated.mdas.find((mda) => mda.slug === 'son').services;
  assert.equal(report.mdaCount, 5);
  assert.equal(report.serviceCount, 30);
  assert.equal(report.feeOptionCount, 30);
  assert.equal(report.verifiedCount, 25);
  assert.equal(report.pendingCount, 5);
  assert.equal(report.conflictingCount, 0);
  assert.equal(report.uniqueEvidenceCount, 8);
  assert.equal(report.evidenceLinkCount, 37);
  assert.equal(report.officialChannelCount, 35);
  assert.equal(report.duplicateRiskCount, 0);
  assert.equal(report.writes, 0);
  assert.ok(nafdacServices.every((service) => service.verificationStatus === 'pending'));
  assert.equal(nafdacServices.find((service) => service.slug === 'general-nafdac-tariff-register').pricingModel, 'variable');
  assert.equal(nafdacServices.find((service) => service.slug === 'general-nafdac-tariff-register').amount, null);
  assert.ok(sonServices.every((service) => service.currency === 'USD'));
  assert.equal(new Set(sonServices.flatMap((service) => service.evidence.map((source) => source.key))).size, 1);
  assert.equal(allServices.filter((service) => service.verificationStatus === 'pending').length, 5);
});

test('dry-run performs no writes and preserves free, formula and conflicting semantics', () => {
  const pool = fakePool();
  const report = dryRunReport(validateManifest(manifest), 'batch-01');
  assert.equal(report.writes, 0);
  assert.equal(pool.state.mdas.length, 0);
  const allServices = manifest.mdas.flatMap((mda) => mda.services);
  assert.equal(allServices.find((service) => service.name === 'Tax ID/TIN generation or retrieval').amount, null);
  assert.match(allServices.find((service) => service.name === 'Name reservation - standard').formula, /statutory fee/);
  assert.equal(allServices.find((service) => service.name === 'Date-of-birth modification').verificationStatus, 'conflicting');
});

test('apply path is idempotent, preserves fee evidence and conflicts, links sources, and creates channels without review events', async () => {
  const pool = fakePool();
  const validated = validateManifest(manifest);
  const first = await importBatch({ manifest: validated, batch: 'batch-01', pool, actorAdminUserId: null });
  const second = await importBatch({ manifest: validated, batch: 'batch-01', pool, actorAdminUserId: null });
  assert.equal(first.mdaCount, 5);
  assert.equal(first.serviceCount, 25);
  assert.equal(first.officialChannelCount, 29);
  assert.equal(first.verificationEvents, 0);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);
  assert.equal(pool.state.mdas.length, 5);
  assert.equal(pool.state.services.length, 25);
  assert.equal(pool.state.fees.length, 25);
  assert.equal(pool.state.sources.length, 9);
  assert.equal(pool.state.feeSources.length, 30);
  assert.equal(pool.state.channels.length, 29);
  assert.equal(pool.state.verifications.length, 0);
  assert.ok(pool.state.audits.some((audit) => audit.action === 'import.channel.created'));
  assert.equal(pool.state.audits.some((audit) => audit.action === 'import.verification.created'), false);
  const conflictingService = pool.state.services.find((service) => service.slug === 'date-of-birth-modification');
  const conflictingFee = pool.state.fees.find((fee) => fee.service_id === conflictingService.id);
  assert.equal(conflictingFee.verification_status, 'conflicting');
  assert.equal(conflictingFee.amount, null);
  assert.equal(pool.state.fees.filter((fee) => fee.service_id === conflictingService.id).length, 1);
});

test('Batch 2 apply path is idempotent and preserves USD, percentage and conflicting fees', async () => {
  const pool = fakePool();
  const validated = validateManifest(batch2Manifest);
  const first = await importBatch({ manifest: validated, batch: 'batch-02', pool, actorAdminUserId: null });
  const second = await importBatch({ manifest: validated, batch: 'batch-02', pool, actorAdminUserId: null });
  assert.equal(first.mdaCount, 5);
  assert.equal(first.serviceCount, 22);
  assert.equal(first.officialChannelCount, 21);
  assert.equal(first.verificationEvents, 0);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);
  assert.equal(pool.state.mdas.length, 5);
  assert.equal(pool.state.services.length, 22);
  assert.equal(pool.state.fees.length, 22);
  assert.equal(pool.state.sources.length, 11);
  assert.equal(pool.state.feeSources.length, 26);
  assert.equal(pool.state.channels.length, 21);
  assert.equal(pool.state.verifications.length, 0);
  const percentageService = pool.state.services.find((service) => service.slug === 'deed-of-assignment-gift');
  const percentageFee = pool.state.fees.find((fee) => fee.service_id === percentageService.id);
  assert.equal(percentageFee.pricing_model, 'percentage');
  assert.equal(percentageFee.percentage, 8);
  const usdService = pool.state.services.find((service) => service.slug === 'online-self-service-birth-registration');
  const usdFee = pool.state.fees.find((fee) => fee.service_id === usdService.id);
  assert.equal(usdFee.currency, 'USD');
  assert.equal(usdFee.amount, 30);
  const conflictingService = pool.state.services.find((service) => service.slug === 'printing-of-result-slip');
  const conflictingFee = pool.state.fees.find((fee) => fee.service_id === conflictingService.id);
  assert.equal(conflictingFee.verification_status, 'conflicting');
  assert.equal(conflictingFee.amount, null);
});

test('Batch 3 apply path is idempotent and preserves pending, USD, variable and shared evidence', async () => {
  const pool = fakePool();
  const validated = validateManifest(batch3Manifest);
  const first = await importBatch({ manifest: validated, batch: 'batch-03', pool, actorAdminUserId: null });
  const second = await importBatch({ manifest: validated, batch: 'batch-03', pool, actorAdminUserId: null });
  assert.equal(first.mdaCount, 5);
  assert.equal(first.serviceCount, 30);
  assert.equal(first.evidenceLinkCount, 37);
  assert.equal(first.officialChannelCount, 35);
  assert.equal(first.verificationEvents, 0);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);
  assert.equal(pool.state.mdas.length, 5);
  assert.equal(pool.state.services.length, 30);
  assert.equal(pool.state.fees.length, 30);
  assert.equal(pool.state.sources.length, 8);
  assert.equal(pool.state.feeSources.length, 37);
  assert.equal(pool.state.channels.length, 35);
  assert.equal(pool.state.verifications.length, 0);
  const nafdacServiceIds = new Set(pool.state.services.filter((service) => service.mda_id === pool.state.mdas.find((mda) => mda.slug === 'nafdac').id).map((service) => service.id));
  assert.ok(pool.state.fees.filter((fee) => nafdacServiceIds.has(fee.service_id)).every((fee) => fee.verification_status === 'pending'));
  const variableService = pool.state.services.find((service) => service.slug === 'general-nafdac-tariff-register');
  const variableFee = pool.state.fees.find((fee) => fee.service_id === variableService.id);
  assert.equal(variableFee.pricing_model, 'variable');
  assert.equal(variableFee.amount, null);
  const usdService = pool.state.services.find((service) => service.slug === 'soncap-product-certificate-1-unregistered-status');
  const usdFee = pool.state.fees.find((fee) => fee.service_id === usdService.id);
  assert.equal(usdFee.currency, 'USD');
  assert.equal(usdFee.amount, 500);
  const sonSource = pool.state.sources.find((source) => source.url === 'https://son.gov.ng/soncap-faq/');
  assert.equal(pool.state.feeSources.filter((link) => link.source_id === sonSource.id).length, 6);
});

test('FRSC catalogue integration validates, preserves confidential SLA protection, and imports idempotently', async () => {
  assert.ok(FRSC_CATALOGUE_PATH.endsWith('frsc-service-catalogue.json'));
  assert.equal(frscCatalogue.confidentiality.markedConfidential, true);
  assert.equal(frscCatalogue.confidentiality.publiclyHostedByFeeLens, false);
  assert.equal(frscCatalogue.confidentiality.sha256, '3a38011ca7c790cef0c3ffe98c7e2521df51fa4a8f60594985a99c3699c12a18');
  for (const source of Object.values(frscCatalogue.sources)) {
    assert.equal(source.url.includes('REVIEWED_SLA_2026'), false, 'Public source register must not expose the confidential SLA PDF URL');
  }

  const withFrsc = validateManifest(buildFrscManifest(manifest, frscCatalogue));
  const frscMda = withFrsc.mdas.find((mda) => mda.slug === 'frsc-drivers-licence');
  assert.equal(frscMda.name, 'Federal Road Safety Corps');
  assert.equal(frscMda.services.length, 13);
  const allFeeOptions = frscMda.services.flatMap((service) => service.feeOptions);
  assert.equal(allFeeOptions.length, 30);
  assert.equal(allFeeOptions.filter((option) => option.verificationStatus === 'verified').length, 9);
  assert.equal(allFeeOptions.filter((option) => option.verificationStatus === 'pending').length, 7);
  assert.equal(allFeeOptions.filter((option) => option.verificationStatus === 'conflicting').length, 14);

  const onlineVerification = frscMda.services.find((service) => service.slug === 'frsc-drivers-licence-online-verification');
  assert.equal(onlineVerification.verificationStatus, 'pending');
  assert.equal(onlineVerification.amount, null);

  const fullLoaded = validateManifest(loadManifest(DEFAULT_MANIFEST_PATH));
  const fullReport = dryRunReport(fullLoaded, 'batch-01');
  assert.equal(fullReport.mdaCount, 5);
  assert.equal(fullReport.duplicateRiskCount, 0);
  assert.equal(fullReport.writes, 0);

  const pool = fakePool();
  const first = await importBatch({ manifest: withFrsc, batch: 'batch-01', pool, actorAdminUserId: null });
  const second = await importBatch({ manifest: withFrsc, batch: 'batch-01', pool, actorAdminUserId: null });
  assert.equal(first.mdaCount, 5);
  assert.equal(first.serviceCount, 34);
  assert.equal(first.feeOptionCount, 51);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);
});
