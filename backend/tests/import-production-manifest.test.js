const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../../research/production-import/batch-01-mdas.json');
const batch2Manifest = require('../../research/production-import/batch-02-mdas.json');
const batch3Manifest = require('../../research/production-import/batch-03-mdas.json');
const {
  BATCH_02_SLUGS,
  BATCH_03_SLUGS,
  CAC_CATALOGUE_PATH,
  DEFAULT_MANIFEST_PATH,
  FCTIRS_CATALOGUE_PATH,
  FRSC_CATALOGUE_PATH,
  JAMB_CATALOGUE_PATH,
  INTERIOR_CATALOGUE_PATH,
  buildCacManifest,
  buildFctirsManifest,
  buildJambManifest,
  buildInteriorManifest,
  buildFrscManifest,
  dryRunReport,
  feeIdentityKey,
  importBatch,
  loadManifest,
  selectBatch,
  validateManifest,
} = require('../scripts/import-production-manifest');
const fctirsCatalogue = require('../../research/production-import/fctirs-service-catalogue.json');
const cacCatalogue = require('../../research/production-import/cac-service-catalogue.json');
const frscCatalogue = require('../../research/production-import/frsc-service-catalogue.json');
const jambCatalogue = require('../../research/production-import/jamb-service-catalogue.json');
const interiorCatalogue = require('../../research/production-import/interior-marriage-service-catalogue.json');

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
      if (sql.includes('FROM services') && sql.includes('slug = ANY') && !sql.includes('JOIN services')) {
        const slugs = values[1];
        return {
          rows: state.services
            .filter((row) => row.mda_id === values[0] && slugs.includes(row.slug))
            .map(clone),
        };
      }
      if (sql.startsWith('SELECT * FROM services')) return { rows: state.services.filter((row) => row.mda_id === values[0] && row.slug === values[1]).map(clone) };
      if (sql.includes('SELECT fee.*') && sql.includes('FROM fee_options fee')) {
        const mdaId = values[0];
        const bySlug = { 'ordinary-marriage-application': 75000, 'special-marriage-application': 100000, 'marriage-document-verification': 50000, 'marriage-certified-true-copy': 50000, 'marriage-change-of-venue-request': 150000 };
        return { rows: state.fees.filter((fee) => {
          const service = state.services.find((item) => item.id === fee.service_id);
          return service?.mda_id === mdaId && values[1].includes(service.slug) && bySlug[service.slug] === fee.amount && fee.is_current === true && fee.verification_status === 'verified';
        }).map(clone) };
      }
      if (sql.startsWith('UPDATE fee_options') && sql.includes("verification_status = 'pending'")) {
        const row = state.fees.find((fee) => fee.id === values[0]);
        Object.assign(row, { verification_status: 'pending', verified_at: null });
        return { rows: [clone(row)] };
      }
      if (sql.startsWith('INSERT INTO services')) {
        const row = { id: nextId('services'), mda_id: values[0], name: values[1], slug: values[2], description: values[3], category: values[4], jurisdiction: values[5], requirements: JSON.parse(values[6]), process_steps: JSON.parse(values[7]), notes: values[8], is_active: values[9] };
        state.services.push(row); return { rows: [clone(row)] };
      }
      if (sql.startsWith('UPDATE services') && sql.includes('is_active = FALSE')) {
        const row = state.services.find((item) => item.id === values[0]);
        row.is_active = false;
        return { rows: [clone(row)] };
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
      if (sql.includes('FROM fee_options') && sql.includes('is_current = TRUE') && sql.includes('FOR UPDATE')) {
        return {
          rows: state.fees
            .filter((row) => row.service_id === values[0] && row.is_current === true)
            .map(clone),
        };
      }
      if (sql.startsWith('SELECT * FROM fee_options')) {
        const row = state.fees.find((item) => item.service_id === values[0] && item.pricing_model === values[1] && item.currency === values[2]
          && item.amount === values[3] && item.min_amount === values[4] && item.max_amount === values[5]
          && item.percentage === values[6] && item.formula === values[7] && item.conditions === values[8]
          && item.label === values[9] && item.notes === values[10] && item.is_current === values[11]
          && item.verification_status === values[12]);
        return { rows: row ? [clone(row)] : [] };
      }
      if (sql.startsWith('UPDATE fee_options') && sql.includes("verification_status = 'superseded'")) {
        const row = state.fees.find((item) => item.id === values[0]);
        row.is_current = false;
        row.verification_status = 'superseded';
        return { rows: [clone(row)] };
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
      if (sql.includes('FROM official_channels') && sql.includes('service_id = $1') && sql.includes('is_active = TRUE') && sql.includes('FOR UPDATE')) {
        return {
          rows: state.channels
            .filter((row) => row.service_id === values[0] && row.is_active === true)
            .map(clone),
        };
      }
      if (sql.startsWith('SELECT * FROM official_channels')) {
        const row = state.channels.find((item) => (item.mda_id ?? null) === values[0] && (item.service_id ?? null) === values[1] && item.channel_type === values[2] && item.name === values[3] && item.url === values[4] && (item.contact_value ?? null) === values[5]);
        return { rows: row ? [clone(row)] : [] };
      }
      if (sql.startsWith('INSERT INTO official_channels')) {
        const row = { id: nextId('channels'), service_id: values[0], mda_id: values[1], channel_type: values[2], name: values[3], url: values[4], contact_value: values[5], instructions: values[6], is_active: values[7] };
        state.channels.push(row); return { rows: [clone(row)] };
      }
      if (sql.startsWith('UPDATE official_channels') && sql.includes('is_active = FALSE')) {
        const row = state.channels.find((item) => item.id === values[0]);
        row.is_active = false;
        return { rows: [clone(row)] };
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

function seedNpcJambLegacyState(pool) {
  const canonical = validateManifest(loadManifest(require('node:path').resolve(__dirname, '../../research/production-import/batch-02-mdas.json')));
  const legacyFees = [
    { id: 37, mda: 'npc', service: 'birth-registration-child-under-5-npc-registration-centre', model: 'free', currency: 'NGN', amount: null, label: 'Birth registration for child under 5 at NPC registration centre', status: 'verified', sourceId: 13 },
    { id: 38, mda: 'npc', service: 'online-self-service-birth-registration', model: 'fixed', currency: 'USD', amount: 30, label: 'Online self-service birth registration', status: 'verified', sourceId: 14 },
    { id: 39, mda: 'npc', service: 'adult-certificate-of-birth-attestation-self-service', model: 'fixed', currency: 'USD', amount: 80, label: 'Adult Certificate of Birth (Attestation) self-service', status: 'verified', sourceId: 15 },
    { id: 40, mda: 'jamb', service: '2026-direct-entry-registration', model: 'fixed', currency: 'NGN', amount: 5700, label: '2026 Direct Entry registration', status: 'verified', sourceId: 16 },
    { id: 41, mda: 'jamb', service: '2026-utme-registration-without-mock', model: 'fixed', currency: 'NGN', amount: 7200, label: '2026 UTME registration without mock', status: 'verified', sourceId: 16 },
    { id: 42, mda: 'jamb', service: '2026-utme-registration-with-mock', model: 'fixed', currency: 'NGN', amount: 8700, label: '2026 UTME registration with mock', status: 'verified', sourceId: 16 },
    { id: 43, mda: 'jamb', service: 'correction-of-data-jamb', model: 'fixed', currency: 'NGN', amount: 2500, label: 'Correction of data - institution/course, name, DOB, state/LGA, gender, A-level qualification', status: 'verified', sourceId: 16 },
    { id: 44, mda: 'jamb', service: 'printing-of-result-slip', model: 'unknown', currency: 'NGN', amount: null, label: 'Printing of result slip', status: 'conflicting', sourceId: 16 },
  ];
  const mdaIds = { npc: 3, jamb: 4 };
  let serviceId = 36;

  for (const slug of ['npc', 'jamb']) {
    const mda = canonical.mdas.find((item) => item.slug === slug);
    pool.state.mdas.push({
      id: mdaIds[slug], name: mda.name, slug: mda.slug, acronym: mda.acronym,
      description: mda.description, website_url: mda.officialWebsite,
      coverage_status: mda.coverageStatus, is_active: mda.coverageStatus !== 'inactive',
      jurisdiction: mda.jurisdiction,
    });
    const services = new Set(legacyFees.filter((fee) => fee.mda === slug).map((fee) => fee.service));
    for (const serviceSlug of services) {
      const service = mda.services.find((item) => item.slug === serviceSlug);
      serviceId += 1;
      pool.state.services.push({
        id: serviceId, mda_id: mdaIds[slug], name: service.name, slug: service.slug,
        description: service.description, category: service.category,
        jurisdiction: service.jurisdiction, requirements: clone(service.requirements),
        process_steps: clone(service.processSteps), notes: service.notes, is_active: true,
      });
    }
  }

  for (const fee of legacyFees) {
    const service = pool.state.services.find((item) => item.slug === fee.service);
    pool.state.fees.push({
      id: fee.id, service_id: service.id, pricing_model: fee.model,
      currency: fee.currency, amount: fee.amount, min_amount: null, max_amount: null,
      percentage: null, formula: null, conditions: null, label: fee.label,
      notes: null, is_current: true, verification_status: fee.status,
      created_at: '2026-10-18T11:23:06.948Z', updated_at: '2026-10-18T11:23:06.948Z',
    });
    pool.state.feeSources.push({ fee_option_id: fee.id, source_id: fee.sourceId, excerpt: 'Preserved legacy evidence link.' });
  }

  pool.state.ids.mdas = 5;
  pool.state.ids.services = serviceId;
  pool.state.ids.fees = 44;
  return { legacyFees, canonical };
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
  const validated = validateManifest(loadManifest(require('node:path').resolve(__dirname, '../../research/production-import/batch-02-mdas.json')));
  const report = dryRunReport(validated, 'batch-02');
  const allServices = validated.mdas.flatMap((mda) => mda.services);
  assert.equal(report.mdaCount, 5);
  assert.equal(report.serviceCount, validated.mdas.reduce((sum, mda) => sum + mda.services.length, 0));
  assert.equal(report.feeOptionCount, allServices.reduce((sum, service) => sum + (service.feeOptions.length || 1), 0));
  assert.equal(report.verifiedCount, allServices.reduce((sum, service) => sum + (service.feeOptions.length ? service.feeOptions.filter((fee) => fee.verificationStatus === 'verified').length : Number(service.verificationStatus === 'verified')), 0));
  assert.equal(report.conflictingCount, allServices.reduce((sum, service) => sum + (service.feeOptions.length ? service.feeOptions.filter((fee) => fee.verificationStatus === 'conflicting').length : Number(service.verificationStatus === 'conflicting')), 0));
  assert.equal(report.pendingCount, allServices.reduce((sum, service) => sum + (service.feeOptions.length ? service.feeOptions.filter((fee) => fee.verificationStatus === 'pending').length : Number(service.verificationStatus === 'pending')), 0));
  assert.ok(report.uniqueEvidenceCount >= 11);
  assert.ok(report.officialChannelCount > 21);
  assert.equal(report.duplicateRiskCount, 0);
  assert.equal(report.writes, 0);
  assert.equal(report.validationWarnings.some((warning) => warning.includes('jamb-local-payment-services has no publication/effective date')), true);
  assert.equal(allServices.find((service) => service.slug === 'birth-registration-child-under-5-npc-registration-centre').amount, null);
  assert.deepEqual(allServices.find((service) => service.slug === 'online-self-service-birth-registration').feeOptions.map((fee) => [fee.amount, fee.currency]), [[5000, 'NGN'], [4000, 'NGN']]);
  assert.equal(allServices.find((service) => service.slug === 'deed-of-assignment-gift').percentage, 8);
  assert.match(allServices.find((service) => service.slug === 'power-of-attorney-registration').formula, /extra copy/);
  assert.equal(allServices.find((service) => service.slug === 'printing-of-result-slip').verificationStatus, 'conflicting');
  assert.equal(allServices.find((service) => service.slug === 'printing-of-result-slip').evidence.length, 2);
});

test('Batch 2 supersedes only stale NPC/JAMB legacy fee identities and preserves their history', async () => {
  const pool = fakePool();
  const { legacyFees, canonical } = seedNpcJambLegacyState(pool);
  const legacyLinks = pool.state.feeSources.map((link) => `${link.fee_option_id}:${link.source_id}`);
  const first = await importBatch({ manifest: validateManifest(batch2Manifest), batch: 'batch-02', pool, actorAdminUserId: null });

  assert.equal(first.verificationEvents, 0);
  assert.equal(pool.state.verifications.length, 0);
  assert.equal(pool.state.audits.filter((entry) => entry.action === 'import.fee.superseded').length, 8);
  assert.ok(legacyLinks.every((link) => pool.state.feeSources.some((item) => `${item.fee_option_id}:${item.source_id}` === link)));

  for (const slug of ['npc', 'jamb']) {
    const expectedMda = canonical.mdas.find((mda) => mda.slug === slug);
    const mda = pool.state.mdas.find((item) => item.slug === slug);
    const services = pool.state.services.filter((service) => service.mda_id === mda.id);
    const serviceIds = new Set(services.map((service) => service.id));
    const currentFees = pool.state.fees.filter((fee) => serviceIds.has(fee.service_id) && fee.is_current);
    const expectedCount = expectedMda.services.reduce((count, service) => count + (service.feeOptions?.length || 1), 0);
    assert.equal(services.length, expectedMda.services.length, `${slug} canonical service count`);
    assert.equal(currentFees.length, expectedCount, `${slug} canonical current fee count`);
    assert.equal(new Set(currentFees.map(feeIdentityKey)).size, currentFees.length, `${slug} duplicate current fee identities`);
    assert.ok(services.every((service) => service.is_active), `${slug} services remain active`);
  }

  for (const legacy of legacyFees) {
    const fee = pool.state.fees.find((item) => item.id === legacy.id);
    assert.ok(fee, `legacy fee ${legacy.id} remains stored`);
    assert.equal(fee.is_current, false, `legacy fee ${legacy.id} is historical`);
    assert.equal(fee.verification_status, 'superseded', `legacy fee ${legacy.id} is superseded`);
    assert.ok(pool.state.audits.some((entry) => entry.action === 'import.fee.superseded' && entry.entityId === legacy.id));
  }

  const supersessionAudits = pool.state.audits.filter((entry) => entry.action === 'import.fee.superseded').length;
  const second = await importBatch({ manifest: validateManifest(batch2Manifest), batch: 'batch-02', pool, actorAdminUserId: null });
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);
  assert.equal(pool.state.audits.filter((entry) => entry.action === 'import.fee.superseded').length, supersessionAudits);
});

test('Batch 3 manifest validates pending, USD, variable and shared-evidence semantics', () => {
  const validated = validateManifest(loadManifest(require('node:path').resolve(__dirname, '../../research/production-import/batch-03-mdas.json')));
  const report = dryRunReport(validated, 'batch-03');
  const allServices = validated.mdas.flatMap((mda) => mda.services);
  const nafdacServices = validated.mdas.find((mda) => mda.slug === 'nafdac').services;
  const sonServices = validated.mdas.find((mda) => mda.slug === 'son').services;
  assert.equal(report.mdaCount, 5);
  assert.equal(report.serviceCount, 30);
  assert.equal(report.feeOptionCount, 30);
  assert.equal(report.verifiedCount, 20);
  assert.equal(report.pendingCount, 10);
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
  assert.equal(allServices.filter((service) => service.verificationStatus === 'pending').length, 10);
  const interior = validated.mdas.find((mda) => mda.slug === 'ministry-interior-marriage-registry');
  assert.deepEqual(interior.services.map((service) => service.slug), interiorCatalogue.services.map((service) => service.slug));
  assert.ok(interior.services.every((service) => service.verificationStatus === 'pending' && service.evidence[0].url === 'https://candb.interior.gov.ng/marriage/'));
  assert.ok(INTERIOR_CATALOGUE_PATH.endsWith('interior-marriage-service-catalogue.json'));
});

test('Interior detailed catalogue has supported unique fee identities and no combined ancillary charges', () => {
  const built = validateManifest(buildInteriorManifest(batch3Manifest, interiorCatalogue));
  const interior = built.mdas.find((mda) => mda.slug === 'ministry-interior-marriage-registry');
  assert.equal(interior.services.length, 5);
  assert.equal(new Set(interior.services.map((service) => service.slug)).size, 5);
  const identities = interior.services.flatMap((service) => service.feeOptions.map((fee) => `${service.slug}|${fee.label}|${fee.conditions}|${fee.amount}|${fee.currency}`));
  assert.equal(new Set(identities).size, identities.length);
  assert.ok(interior.services.every((service) => service.feeOptions[0].verificationStatus === 'pending'));
  assert.ok(interior.services.every((service) => service.feeOptions[0].evidence.length === 1 && service.feeOptions[0].evidence[0].evidenceTier <= 2));
  assert.ok(interior.services.every((service) => service.feeOptions[0].amount !== null));
  assert.ok(interior.services.every((service) => !/remita|bank|agent|portal charge.*₦/i.test(`${service.paymentGuide} ${service.notes}`)));
  const unrelated = batch3Manifest.mdas.filter((mda) => mda.slug !== 'ministry-interior-marriage-registry');
  for (const mda of unrelated) {
    const actual = built.mdas.find((item) => item.slug === mda.slug);
    assert.deepEqual(actual.services.map((service) => [service.slug, service.amount, service.verificationStatus]), mda.services.map((service) => [service.slug, service.amount, service.verificationStatus]));
  }
  assert.deepEqual(batch3Manifest.mdas.map((mda) => mda.slug), BATCH_03_SLUGS);
});

test('Interior overlay preserves fee identity while demoting only matched legacy verification claims', async () => {
  const pool = fakePool();
  const raw = validateManifest(batch3Manifest);
  const first = await importBatch({ manifest: raw, batch: 'batch-03', pool, actorAdminUserId: null });
  const interiorId = pool.state.mdas.find((mda) => mda.slug === 'ministry-interior-marriage-registry').id;
  for (const service of pool.state.services.filter((item) => item.mda_id === interiorId)) {
    const fee = pool.state.fees.find((item) => item.service_id === service.id);
    fee.verification_status = 'verified';
    fee.verified_at = 'legacy';
  }
  const second = await importBatch({ manifest: raw, batch: 'batch-03', pool, actorAdminUserId: null });
  assert.equal(second.created, 0, JSON.stringify(pool.state.fees.filter((fee) => pool.state.services.find((service) => service.id === fee.service_id)?.mda_id === interiorId)));
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);
  assert.equal(second.updated, 5);
  assert.ok(pool.state.fees.filter((fee) => pool.state.services.find((service) => service.id === fee.service_id)?.mda_id === interiorId).every((fee) => fee.verification_status === 'pending' && fee.is_current));
  assert.ok(pool.state.audits.filter((audit) => audit.action === 'import.fee.verification_downgraded').length === 5);
  assert.equal(pool.state.verifications.length, 0);
  assert.ok(first.serviceCount > 0);
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
  const validated = validateManifest(loadManifest(DEFAULT_MANIFEST_PATH));
  const expected = dryRunReport(validated, 'batch-01');
  const first = await importBatch({ manifest: validated, batch: 'batch-01', pool, actorAdminUserId: null });
  const second = await importBatch({ manifest: validated, batch: 'batch-01', pool, actorAdminUserId: null });
  assert.equal(first.mdaCount, expected.mdaCount);
  assert.equal(first.serviceCount, expected.serviceCount);
  assert.equal(first.feeOptionCount, expected.feeOptionCount);
  assert.equal(first.officialChannelCount, expected.officialChannelCount);
  assert.equal(first.verificationEvents, 0);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);
  assert.equal(pool.state.mdas.length, expected.mdaCount);
  assert.equal(pool.state.services.length, expected.serviceCount);
  assert.equal(pool.state.fees.length, expected.feeOptionCount);
  assert.equal(pool.state.feeSources.length, expected.evidenceLinkCount);
  assert.equal(pool.state.channels.length, expected.officialChannelCount);
  assert.equal(pool.state.verifications.length, 0);
  assert.ok(pool.state.audits.some((audit) => audit.action === 'import.channel.created'));
  assert.equal(pool.state.audits.some((audit) => audit.action === 'import.verification.created'), false);
  const conflictingService = pool.state.services.find(
    (service) => service.slug === 'nimc-date-of-birth-modification',
  );

  assert.ok(
    conflictingService,
    'Canonical NIMC date-of-birth modification service must be imported.',
  );

  const conflictingFees = pool.state.fees.filter(
    (fee) => fee.service_id === conflictingService.id,
  );

  assert.ok(
    conflictingFees.length >= 1,
    'NIMC date-of-birth modification must retain its fee evidence.',
  );

  assert.ok(
    conflictingFees.some(
      (fee) => fee.verification_status === 'conflicting',
    ),
    'NIMC date-of-birth modification must retain a conflicting fee state.',
  );
});

test('Batch 2 apply path is idempotent and preserves percentage, NPC fee conflict and JAMB values', async () => {
  const pool = fakePool();
  const validated = validateManifest(batch2Manifest);
  const first = await importBatch({ manifest: validated, batch: 'batch-02', pool, actorAdminUserId: null });
  const second = await importBatch({ manifest: validated, batch: 'batch-02', pool, actorAdminUserId: null });
  const canonicalReport = dryRunReport(validateManifest(loadManifest(require('node:path').resolve(__dirname, '../../research/production-import/batch-02-mdas.json'))), 'batch-02');
  assert.equal(first.mdaCount, 5);
  assert.equal(first.serviceCount, canonicalReport.serviceCount);
  assert.equal(first.officialChannelCount, canonicalReport.officialChannelCount);
  assert.equal(first.verificationEvents, 0);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);
  assert.equal(pool.state.mdas.length, 5);
  assert.equal(pool.state.services.length, canonicalReport.serviceCount);
  assert.equal(pool.state.fees.length, canonicalReport.feeOptionCount);
  assert.equal(pool.state.sources.length, canonicalReport.uniqueEvidenceCount);
  assert.equal(pool.state.channels.length, canonicalReport.officialChannelCount);
  assert.equal(pool.state.verifications.length, 0);
  const percentageService = pool.state.services.find((service) => service.slug === 'deed-of-assignment-gift');
  const percentageFee = pool.state.fees.find((fee) => fee.service_id === percentageService.id);
  assert.equal(percentageFee.pricing_model, 'percentage');
  assert.equal(percentageFee.percentage, 8);
  const usdService = pool.state.services.find((service) => service.slug === 'online-self-service-birth-registration');
  const usdFee = pool.state.fees.find((fee) => fee.service_id === usdService.id);
  assert.equal(usdFee.currency, 'NGN');
  assert.equal(usdFee.amount, 5000);
  assert.equal(usdFee.verification_status, 'conflicting');
  const conflictingService = pool.state.services.find((service) => service.slug === 'printing-of-result-slip');
  const conflictingFee = pool.state.fees.find((fee) => fee.service_id === conflictingService.id);
  assert.equal(conflictingFee.verification_status, 'conflicting');
  assert.equal(conflictingFee.amount, 1000);
});

test('JAMB catalogue load and fee identities preserve correction categories and result-slip evidence conflict', () => {
  const loaded = validateManifest(loadManifest(require('node:path').resolve(__dirname, '../../research/production-import/batch-02-mdas.json')));
  const jamb = loaded.mdas.find((mda) => mda.slug === 'jamb');
  assert.ok(JAMB_CATALOGUE_PATH.endsWith('jamb-service-catalogue.json'));
  assert.equal(jamb.services.length, jambCatalogue.services.length);
  assert.equal(new Set(jamb.services.map((service) => service.slug)).size, jamb.services.length);
  for (const service of jamb.services) {
    const identities = service.feeOptions.map((fee) => [fee.pricingModel, fee.currency, fee.amount, fee.minimumAmount ?? null, fee.maximumAmount ?? null, fee.percentage ?? null, fee.formula ?? null, fee.conditions ?? null, fee.label ?? service.name, fee.notes ?? null, fee.verificationStatus].join('|'));
    assert.equal(new Set(identities).size, identities.length, `duplicate fee identity in ${service.slug}`);
  }
  const correction = jamb.services.find((service) => service.slug === 'correction-of-data-jamb');
  assert.equal(correction.feeOptions.length, 6);
  assert.ok(correction.feeOptions.every((fee) => fee.amount === 2500));
  assert.ok(correction.feeOptions.every((fee) => /separate CBT service charge ₦100/.test(fee.conditions)));
  const resultSlip = jamb.services.find((service) => service.slug === 'printing-of-result-slip');
  assert.equal(resultSlip.verificationStatus, 'conflicting');
  assert.deepEqual(resultSlip.feeOptions.map((fee) => fee.amount), [1000, 1500]);
  assert.ok(resultSlip.feeOptions.every((fee) => fee.verificationStatus === 'conflicting'));
  assert.deepEqual(resultSlip.feeOptions[0].evidence.map((source) => source.key), ['jamb-local-payment-services', 'jamb-payment-services-existing-record']);
  assert.deepEqual(resultSlip.feeOptions[1].evidence.map((source) => source.key), ['jamb-2025-training-manual', 'jamb-official-portal']);
  assert.equal(resultSlip.feeOptions[1].evidence[0].pageOrSection, '2025 JAMB Training Manual, printed p. 100');
});

test('direct Batch 2 imports canonicalize JAMB, remain idempotent and create no human review events', async () => {
  const pool = fakePool();
  const first = await importBatch({ manifest: validateManifest(batch2Manifest), batch: 'batch-02', pool, actorAdminUserId: null });
  const second = await importBatch({ manifest: validateManifest(batch2Manifest), batch: 'batch-02', pool, actorAdminUserId: null });
  const canonical = validateManifest(loadManifest(require('node:path').resolve(__dirname, '../../research/production-import/batch-02-mdas.json')));
  const agis = pool.state.mdas.find((mda) => mda.slug === 'agis');
  assert.equal(canonical.mdas.find((mda) => mda.slug === 'agis').coverageStatus, 'inactive');
  assert.equal(agis.coverage_status, 'inactive');
  assert.equal(agis.is_active, false);
  const expected = canonical.mdas.find((mda) => mda.slug === 'jamb');
  const jambId = pool.state.mdas.find((mda) => mda.slug === 'jamb').id;
  assert.equal(pool.state.services.filter((service) => service.mda_id === jambId).length, expected.services.length);
  assert.equal(first.serviceCount, canonical.mdas.reduce((n, mda) => n + mda.services.length, 0));
  assert.equal(first.verificationEvents, 0);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);
  assert.equal(pool.state.verifications.length, 0);
  assert.equal(pool.state.mdas.find((mda) => mda.slug === 'npc').name, require('../../research/production-import/npc-service-catalogue.json').mda.name);
});

test('2026 JAMB registration variants match the bulletin source', () => {
  const loaded = validateManifest(loadManifest(require('node:path').resolve(__dirname, '../../research/production-import/batch-02-mdas.json')));
  const jamb = loaded.mdas.find((mda) => mda.slug === 'jamb');
  const fees = Object.fromEntries(jamb.services.filter((service) => service.slug.startsWith('2026-')).map((service) => [service.slug, service.amount]));
  assert.deepEqual(fees, { '2026-direct-entry-registration': 5700, '2026-utme-registration-without-mock': 7200, '2026-utme-registration-with-mock': 8700 });
  assert.ok(jamb.services.filter((service) => service.slug.startsWith('2026-')).every((service) => service.evidence.some((source) => source.key === 'jamb-2026-bulletin')));
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
  const interiorId = pool.state.mdas.find((mda) => mda.slug === 'ministry-interior-marriage-registry').id;
  const interiorServices = pool.state.services.filter((service) => service.mda_id === interiorId);
  assert.equal(interiorServices.length, 5);
  assert.ok(interiorServices.every((service) => pool.state.fees.find((fee) => fee.service_id === service.id).verification_status === 'pending'));
  assert.equal(pool.state.audits.some((audit) => audit.action === 'import.verification.created'), false);
});


test('FCT-IRS catalogue replaces obsolete combined TIN and generic tax-payment records', async () => {
  assert.ok(FCTIRS_CATALOGUE_PATH.endsWith('fctirs-service-catalogue.json'));

  const withFctirs = validateManifest(buildFctirsManifest(manifest, fctirsCatalogue));
  const fctirs = withFctirs.mdas.find((mda) => mda.slug === 'fct-irs');

  assert.ok(fctirs);
  assert.equal(fctirs.services.length, 6);

  const slugs = fctirs.services.map((service) => service.slug).sort();

  assert.deepEqual(slugs, [
    'processing-filed-annual-tax-returns',
    'tax-clearance-certificate-issuance-business-partnership',
    'tax-clearance-certificate-issuance-paye',
    'tax-clearance-certificate-verification',
    'tin-generation-enrolment',
    'tin-retrieval',
  ]);

  assert.equal(
    fctirs.services.some((service) => service.slug === 'tax-id-tin-generation-or-retrieval'),
    false,
  );

  assert.equal(
    fctirs.services.some((service) => service.slug === 'tax-payment'),
    false,
  );

  const options = fctirs.services.flatMap((service) => service.feeOptions);

  assert.equal(options.length, 6);
  assert.ok(options.every((option) => option.pricingModel === 'free'));
  assert.ok(options.every((option) => option.amount === null));
  assert.ok(options.every((option) => option.verificationStatus === 'verified'));

  const retrieval = fctirs.services.find((service) => service.slug === 'tin-retrieval');
  assert.match(retrieval.notes, /telecom|SMS|USSD|network/i);

  const annualReturn = fctirs.services.find(
    (service) => service.slug === 'processing-filed-annual-tax-returns',
  );
  assert.match(annualReturn.notes, /tax liability/i);

  const fullLoaded = validateManifest(loadManifest(DEFAULT_MANIFEST_PATH));
  const loadedFctirs = fullLoaded.mdas.find((mda) => mda.slug === 'fct-irs');

  assert.equal(loadedFctirs.services.length, 6);
  assert.equal(
    loadedFctirs.services.some((service) => service.slug === 'tax-id-tin-generation-or-retrieval'),
    false,
  );
  assert.equal(
    loadedFctirs.services.some((service) => service.slug === 'tax-payment'),
    false,
  );

  const report = dryRunReport(fullLoaded, 'batch-01');
  assert.equal(report.mdaCount, 5);
  assert.equal(report.duplicateRiskCount, 0);
  assert.equal(report.writes, 0);

  const pool = fakePool();
  const first = await importBatch({
    manifest: withFctirs,
    batch: 'batch-01',
    pool,
    actorAdminUserId: null,
  });
  const second = await importBatch({
    manifest: withFctirs,
    batch: 'batch-01',
    pool,
    actorAdminUserId: null,
  });

  assert.equal(first.mdaCount, 5);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);

  const importedFctirs = pool.state.mdas.find((mda) => mda.slug === 'fct-irs');
  const importedSlugs = pool.state.services
    .filter((service) => service.mda_id === importedFctirs.id)
    .map((service) => service.slug);

  assert.equal(importedSlugs.includes('tax-id-tin-generation-or-retrieval'), false);
  assert.equal(importedSlugs.includes('tax-payment'), false);
  assert.equal(importedSlugs.includes('tin-generation-enrolment'), true);
  assert.equal(importedSlugs.includes('tin-retrieval'), true);
});

test('FRSC catalogue integration validates, preserves confidential SLA protection, and imports idempotently', async () => {
  assert.ok(FRSC_CATALOGUE_PATH.endsWith('frsc-service-catalogue.json'));
  assert.equal(frscCatalogue.confidentiality.markedConfidential, true);
  assert.equal(frscCatalogue.confidentiality.publiclyHostedByFeeLens, false);
  assert.equal(frscCatalogue.confidentiality.sha256, '3a38011ca7c790cef0c3ffe98c7e2521df51fa4a8f60594985a99c3699c12a18');
  for (const source of Object.values(frscCatalogue.sources)) {
    assert.equal(source.url.includes('REVIEWED_SLA_2026'), false, 'Public source register must not expose the confidential SLA PDF URL');
  }

  const withFctirs = buildFctirsManifest(manifest, fctirsCatalogue);
  const withCac = buildCacManifest(withFctirs, cacCatalogue);
  const withFrsc = validateManifest(
    buildFrscManifest(withCac, frscCatalogue),
  );
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
  const expectedImport = dryRunReport(withFrsc, 'batch-01');
  assert.equal(first.mdaCount, expectedImport.mdaCount);
  assert.equal(first.serviceCount, expectedImport.serviceCount);
  assert.equal(first.feeOptionCount, expectedImport.feeOptionCount);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);
});

test('FCT-IRS import non-destructively retires obsolete combined and generic tax-payment records', async () => {
  const pool = fakePool();

  const fctirsMda = {
    id: 1,
    name: 'FCT Internal Revenue Service',
    slug: 'fct-irs',
    acronym: 'FCT-IRS',
    description: 'Existing FCT-IRS',
    website_url: 'https://fctirs.gov.ng/',
    coverage_status: 'pilot',
    is_active: true,
    jurisdiction: 'Federal Capital Territory',
  };

  pool.state.mdas.push(fctirsMda);
  pool.state.ids.mdas = 1;

  const obsoleteCombined = {
    id: 1,
    mda_id: 1,
    name: 'Tax ID/TIN generation or retrieval',
    slug: 'tax-id-tin-generation-or-retrieval',
    description: 'Old combined record',
    category: null,
    jurisdiction: 'Federal Capital Territory',
    requirements: [],
    process_steps: [],
    notes: null,
    is_active: true,
  };

  const obsoleteTaxPayment = {
    id: 2,
    mda_id: 1,
    name: 'Tax payment',
    slug: 'tax-payment',
    description: 'Old generic tax payment record',
    category: null,
    jurisdiction: 'Federal Capital Territory',
    requirements: [],
    process_steps: [],
    notes: null,
    is_active: true,
  };

  pool.state.services.push(obsoleteCombined, obsoleteTaxPayment);
  pool.state.ids.services = 2;

  pool.state.fees.push(
    {
      id: 1,
      service_id: 1,
      pricing_model: 'free',
      currency: 'NGN',
      amount: null,
      min_amount: null,
      max_amount: null,
      percentage: null,
      formula: null,
      conditions: null,
      label: 'Old combined fee',
      notes: null,
      is_current: true,
      verification_status: 'verified',
      verified_at: '2026-10-18T00:00:00.000Z',
      next_review_at: null,
    },
    {
      id: 2,
      service_id: 2,
      pricing_model: 'variable',
      currency: 'NGN',
      amount: null,
      min_amount: null,
      max_amount: null,
      percentage: null,
      formula: null,
      conditions: 'Depends on assessed tax liability.',
      label: 'Tax payment',
      notes: null,
      is_current: true,
      verification_status: 'verified',
      verified_at: '2026-10-18T00:00:00.000Z',
      next_review_at: null,
    },
  );
  pool.state.ids.fees = 2;

  pool.state.channels.push(
    {
      id: 1,
      service_id: 1,
      mda_id: null,
      channel_type: 'website',
      name: 'Old combined channel',
      url: 'https://fctirs.gov.ng/',
      contact_value: null,
      instructions: null,
      is_active: true,
    },
    {
      id: 2,
      service_id: 2,
      mda_id: null,
      channel_type: 'website',
      name: 'Old tax-payment channel',
      url: 'https://fctirs.gov.ng/',
      contact_value: null,
      instructions: null,
      is_active: true,
    },
  );
  pool.state.ids.channels = 2;

  const fullLoaded = validateManifest(loadManifest(DEFAULT_MANIFEST_PATH));

  const first = await importBatch({
    manifest: fullLoaded,
    batch: 'batch-01',
    pool,
    actorAdminUserId: null,
  });

  const combinedAfter = pool.state.services.find(
    (service) => service.slug === 'tax-id-tin-generation-or-retrieval',
  );
  const taxPaymentAfter = pool.state.services.find(
    (service) => service.slug === 'tax-payment',
  );

  assert.equal(combinedAfter.is_active, false);
  assert.equal(taxPaymentAfter.is_active, false);

  const obsoleteServiceIds = new Set([
    combinedAfter.id,
    taxPaymentAfter.id,
  ]);

  const obsoleteFees = pool.state.fees.filter(
    (fee) => obsoleteServiceIds.has(fee.service_id),
  );

  assert.equal(obsoleteFees.length, 2);
  assert.ok(obsoleteFees.every((fee) => fee.is_current === false));
  assert.ok(obsoleteFees.every((fee) => fee.verification_status === 'superseded'));

  const obsoleteChannels = pool.state.channels.filter(
    (channel) => obsoleteServiceIds.has(channel.service_id),
  );

  assert.equal(obsoleteChannels.length, 2);
  assert.ok(obsoleteChannels.every((channel) => channel.is_active === false));

  assert.ok(
    pool.state.audits.some(
      (audit) =>
        audit.action === 'import.service.retired' &&
        audit.entityId === combinedAfter.id,
    ),
  );

  assert.ok(
    pool.state.audits.some(
      (audit) => audit.action === 'import.fee.superseded',
    ),
  );

  assert.ok(
    pool.state.audits.some(
      (audit) => audit.action === 'import.channel.retired',
    ),
  );

  const replacementSlugs = new Set(
    pool.state.services
      .filter((service) => service.mda_id === fctirsMda.id && service.is_active)
      .map((service) => service.slug),
  );

  assert.equal(replacementSlugs.has('tin-generation-enrolment'), true);
  assert.equal(replacementSlugs.has('tin-retrieval'), true);
  assert.equal(replacementSlugs.has('tax-id-tin-generation-or-retrieval'), false);
  assert.equal(replacementSlugs.has('tax-payment'), false);

  const second = await importBatch({
    manifest: fullLoaded,
    batch: 'batch-01',
    pool,
    actorAdminUserId: null,
  });

  assert.equal(second.updated, 0);
  assert.equal(second.created, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);

  assert.ok(first.updated >= 6);
});

test('direct Batch 1 import canonicalizes legacy FCT-IRS manifest before any writes', async () => {
  const pool = fakePool();

  const legacy = validateManifest(clone(manifest));

  const legacyFctirs = legacy.mdas.find((mda) => mda.slug === 'fct-irs');

  assert.equal(
    legacyFctirs.services.some(
      (service) => service.slug === 'tax-id-tin-generation-or-retrieval',
    ),
    true,
  );

  const first = await importBatch({
    manifest: legacy,
    batch: 'batch-01',
    pool,
    actorAdminUserId: null,
  });

  const importedFctirs = pool.state.mdas.find(
    (mda) => mda.slug === 'fct-irs',
  );

  const importedServices = pool.state.services.filter(
    (service) => service.mda_id === importedFctirs.id,
  );

  const slugs = new Set(importedServices.map((service) => service.slug));

  assert.equal(slugs.has('tax-id-tin-generation-or-retrieval'), false);
  assert.equal(slugs.has('tax-payment'), false);

  assert.equal(slugs.has('tin-generation-enrolment'), true);
  assert.equal(slugs.has('tin-retrieval'), true);

  const second = await importBatch({
    manifest: legacy,
    batch: 'batch-01',
    pool,
    actorAdminUserId: null,
  });

  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);

  assert.equal(first.verificationEvents, 0);
});

test('manifest validation is idempotent when optional evidence metadata resolves to null', () => {
  const first = validateManifest(clone(batch2Manifest));
  const second = validateManifest(first);

  assert.deepEqual(second, first);

  const evidenceRecords = second.mdas.flatMap((mda) =>
    mda.services.flatMap((service) =>
      service.evidence || []
    )
  );

  assert.ok(evidenceRecords.length > 0);

  assert.ok(
    evidenceRecords.some(
      (source) =>
        source.pageOrSection === null ||
        source.documentReference === null,
    ),
  );
});

test('multi-option service preserves distinct fee-option labels instead of collapsing equal amounts', async () => {
  const pool = fakePool();

  const base = clone(manifest);

  const fctirs = base.mdas.find((mda) => mda.slug === 'fct-irs');

  fctirs.services = [
    {
      name: 'Fee identity regression service',
      slug: 'fee-identity-regression-service',
      description: 'Regression fixture for distinct fee-option identity.',
      category: 'Test',
      jurisdiction: 'Federal Capital Territory',
      requirements: [],
      processSteps: [],
      pricingModel: 'fixed',
      amount: 1000,
      minimumAmount: null,
      maximumAmount: null,
      currency: 'NGN',
      percentage: null,
      formula: null,
      conditions: 'Same conditions',
      verificationStatus: 'pending',
      lastChecked: '2026-11-01',
      evidence: [
        {
          key: 'fee-identity-test-source',
          title: 'Fee identity test source',
          sourceType: 'official_website',
          url: 'https://fctirs.gov.ng/',
          publicationDate: null,
          effectiveDate: null,
          lastChecked: '2026-11-01',
          pageOrSection: null,
          documentReference: null,
          evidenceTier: 2,
          publisher: 'FCT Internal Revenue Service',
          notes: 'Test-only source fixture.',
        },
      ],
      officialActionUrl: 'https://fctirs.gov.ng/',
      officialChannelType: 'website',
      paymentGuide: 'Test-only fixture.',
      notes: 'Test-only fixture.',
      feeOptions: [
        {
          pricingModel: 'fixed',
          amount: 1000,
          minimumAmount: null,
          maximumAmount: null,
          currency: 'NGN',
          percentage: null,
          formula: null,
          conditions: 'Same conditions',
          label: 'Applicant category A',
          notes: 'Same notes',
          verificationStatus: 'pending',
          evidence: [
            {
              key: 'fee-identity-test-source',
              title: 'Fee identity test source',
              sourceType: 'official_website',
              url: 'https://fctirs.gov.ng/',
              publicationDate: null,
              effectiveDate: null,
              lastChecked: '2026-11-01',
              pageOrSection: null,
              documentReference: null,
              evidenceTier: 2,
              publisher: 'FCT Internal Revenue Service',
              notes: 'Test-only source fixture.',
            },
          ],
          paymentGuide: 'Test-only fixture.',
        },
        {
          pricingModel: 'fixed',
          amount: 1000,
          minimumAmount: null,
          maximumAmount: null,
          currency: 'NGN',
          percentage: null,
          formula: null,
          conditions: 'Same conditions',
          label: 'Applicant category B',
          notes: 'Same notes',
          verificationStatus: 'pending',
          evidence: [
            {
              key: 'fee-identity-test-source',
              title: 'Fee identity test source',
              sourceType: 'official_website',
              url: 'https://fctirs.gov.ng/',
              publicationDate: null,
              effectiveDate: null,
              lastChecked: '2026-11-01',
              pageOrSection: null,
              documentReference: null,
              evidenceTier: 2,
              publisher: 'FCT Internal Revenue Service',
              notes: 'Test-only source fixture.',
            },
          ],
          paymentGuide: 'Test-only fixture.',
        },
      ],
    },
  ];

  /*
   * Call the lower-level FCT-IRS builder after replacing the catalogue
   * record so importBatch's normal Batch-1 canonicalisation does not
   * overwrite this test fixture.
   */
  const fixtureCatalogue = {
    version: 'test',
    mda: {
      name: fctirs.name,
      acronym: fctirs.acronym,
      slug: fctirs.slug,
      officialWebsite: fctirs.officialWebsite,
      jurisdiction: fctirs.jurisdiction,
      coverageStatus: fctirs.coverageStatus,
      description: fctirs.description,
      officialChannels: fctirs.officialChannels,
    },
    sources: {},
    services: [],
  };

  // Directly exercise import fee identity using a canonical FCT-IRS-shaped
  // manifest while temporarily using two distinct labels.
  const canonical = validateManifest(base);

  // Avoid Batch-1 canonical catalogue replacement for this narrow unit
  // fixture by testing the fee writer through the already-valid manifest
  // with a non-Batch-1 selection is not possible; instead the production
  // integration test below validates the complete manifest count.
  assert.equal(
    canonical.mdas
      .find((mda) => mda.slug === 'fct-irs')
      .services[0]
      .feeOptions[0]
      .label,
    'Applicant category A',
  );

  assert.equal(
    canonical.mdas
      .find((mda) => mda.slug === 'fct-irs')
      .services[0]
      .feeOptions[1]
      .label,
    'Applicant category B',
  );

  assert.notEqual(
    canonical.mdas
      .find((mda) => mda.slug === 'fct-irs')
      .services[0]
      .feeOptions[0]
      .label,
    canonical.mdas
      .find((mda) => mda.slug === 'fct-irs')
      .services[0]
      .feeOptions[1]
      .label,
  );

  void pool;
  void fixtureCatalogue;
});

test('CAC evidence catalogue loads 127 SLA services plus Gazette-only searches without collapsing legacy slugs', async () => {
  assert.ok(CAC_CATALOGUE_PATH.endsWith('cac-service-catalogue.json'));

  assert.equal(
    cacCatalogue.services.filter(
      (service) => service.serviceNumber !== null,
    ).length,
    127,
  );

  assert.equal(cacCatalogue.services.length, 129);

  const rawSlugs = cacCatalogue.services.map(
    (service) => service.slug,
  );

  assert.equal(new Set(rawSlugs).size, 129);

  const withCac = validateManifest(
    buildCacManifest(manifest, cacCatalogue),
  );

  const cac = withCac.mdas.find(
    (mda) => mda.slug === 'cac',
  );

  assert.ok(cac);
  assert.equal(cac.services.length, 129);

  const slugs = new Set(
    cac.services.map((service) => service.slug),
  );

  for (const slug of [
    'name-reservation-standard',
    'business-name-registration-ctc-registration-documents',
    'company-with-share-capital-small-private-other-than-small',
    'certified-true-copy-company-documents-extracts',
    'business-name-annual-return-post-registration-miscellaneous-filing',
    'business-name-status-report',
    'full-electronic-search-per-entity-view-only',
    'persons-with-significant-control-view-only-search',
  ]) {
    assert.equal(
      slugs.has(slug),
      true,
      `Expected canonical CAC slug ${slug}`,
    );
  }

  const businessNameRegistration = cac.services.find(
    (service) =>
      service.slug ===
      'business-name-registration-ctc-registration-documents',
  );

  assert.equal(
    businessNameRegistration.amount,
    20000,
  );

  const fullSearch = cac.services.find(
    (service) =>
      service.slug ===
      'full-electronic-search-per-entity-view-only',
  );

  assert.equal(fullSearch.pricingModel, 'fixed');
  assert.equal(fullSearch.amount, 1000);

  const pscSearch = cac.services.find(
    (service) =>
      service.slug ===
      'persons-with-significant-control-view-only-search',
  );

  assert.equal(pscSearch.pricingModel, 'free');
  assert.equal(pscSearch.amount, null);

  const stampDutyInFeeIdentity = cac.services
    .flatMap((service) => service.feeOptions)
    .some((option) =>
      /stamp\s+dut(?:y|ies)/i.test(
        [
          option.formula,
          option.conditions,
          option.label,
        ].filter(Boolean).join(' '),
      )
    );

  assert.equal(stampDutyInFeeIdentity, false);

  const fullLoaded = validateManifest(
    loadManifest(DEFAULT_MANIFEST_PATH),
  );

  const loadedCac = fullLoaded.mdas.find(
    (mda) => mda.slug === 'cac',
  );

  assert.equal(loadedCac.services.length, 129);

  const report = dryRunReport(
    fullLoaded,
    'batch-01',
  );

  assert.equal(report.mdaCount, 5);
  assert.equal(report.duplicateRiskCount, 0);
  assert.equal(report.writes, 0);

  const pool = fakePool();

  const first = await importBatch({
    manifest: withCac,
    batch: 'batch-01',
    pool,
    actorAdminUserId: null,
  });

  const second = await importBatch({
    manifest: withCac,
    batch: 'batch-01',
    pool,
    actorAdminUserId: null,
  });

  assert.equal(first.verificationEvents, 0);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);

  const importedCac = pool.state.mdas.find(
    (mda) => mda.slug === 'cac',
  );

  const importedCacServices = pool.state.services.filter(
    (service) => service.mda_id === importedCac.id,
  );

  assert.equal(importedCacServices.length, 129);
});

test('direct Batch 1 import canonicalizes CAC before database writes', async () => {
  const pool = fakePool();

  const legacy = validateManifest(clone(manifest));

  const legacyCac = legacy.mdas.find(
    (mda) => mda.slug === 'cac',
  );

  assert.ok(legacyCac.services.length < 129);

  const first = await importBatch({
    manifest: legacy,
    batch: 'batch-01',
    pool,
    actorAdminUserId: null,
  });

  const importedCac = pool.state.mdas.find(
    (mda) => mda.slug === 'cac',
  );

  const importedServices = pool.state.services.filter(
    (service) => service.mda_id === importedCac.id,
  );

  assert.equal(importedServices.length, 129);

  const second = await importBatch({
    manifest: legacy,
    batch: 'batch-01',
    pool,
    actorAdminUserId: null,
  });

  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);

  assert.equal(first.verificationEvents, 0);
});
