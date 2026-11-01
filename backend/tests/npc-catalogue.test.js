const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const batch2Manifest = require('../../research/production-import/batch-02-mdas.json');
const npcCatalogue = require('../../research/production-import/npc-service-catalogue.json');
const {
  BATCH_02_MANIFEST_PATH,
  NPC_CATALOGUE_PATH,
  buildNpcManifest,
  dryRunReport,
  importBatch,
  loadManifest,
  validateManifest,
} = require('../scripts/import-production-manifest');

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
      if (sql.includes('FROM fee_options') && sql.includes('is_current = TRUE') && sql.includes('FOR UPDATE')) {
        return { rows: state.fees.filter((row) => row.service_id === values[0] && row.is_current === true).map(clone) };
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
        const row = state.fees.find((fee) => fee.id === values[0]);
        Object.assign(row, { is_current: false, verification_status: 'superseded' });
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

test('NPC catalogue reconciles existing claims, enforces non-zero rules for unknown fees, and separates provider dates from internal review dates', () => {
  assert.ok(NPC_CATALOGUE_PATH.endsWith('npc-service-catalogue.json'));
  assert.equal(npcCatalogue.version, '2026-10-31');
  assert.equal(npcCatalogue.mda.slug, 'npc');
  assert.equal(npcCatalogue.existingRecordAudit.length, 3);
  assert.equal(npcCatalogue.services.length, 11);

  // Verify the 3 existing Batch-2 NPC slugs are preserved and reconciled
  const under5 = npcCatalogue.services.find((s) => s.slug === 'birth-registration-child-under-5-npc-registration-centre');
  assert.ok(under5);
  assert.equal(under5.feeOptions[0].pricingModel, 'free');
  assert.equal(under5.feeOptions[0].verificationStatus, 'verified');
  assert.equal(under5.feeOptions[0].amount, null);

  const onlineBirth = npcCatalogue.services.find((s) => s.slug === 'online-self-service-birth-registration');
  assert.ok(onlineBirth);
  assert.equal(onlineBirth.officialActionUrl, 'https://vitalreg-selfservice.nationalpopulation.gov.ng/');
  assert.equal(onlineBirth.feeOptions[0].verificationStatus, 'conflicting');
  assert.equal(onlineBirth.feeOptions[0].currency, 'NGN');
  assert.equal(onlineBirth.feeOptions[0].amount, 5000);
  assert.equal(onlineBirth.feeOptions[1].verificationStatus, 'pending');
  assert.equal(onlineBirth.feeOptions[1].amount, 4000);

  const adultAttestation = npcCatalogue.services.find((s) => s.slug === 'adult-certificate-of-birth-attestation-self-service');
  assert.ok(adultAttestation);
  assert.equal(adultAttestation.officialActionUrl, 'https://vitalreg-selfservice.nationalpopulation.gov.ng/');
  assert.equal(adultAttestation.feeOptions[0].verificationStatus, 'conflicting');
  assert.equal(adultAttestation.feeOptions[0].currency, 'NGN');
  assert.equal(adultAttestation.feeOptions[0].amount, 15000);

  // Verify unknown fees are never published as free or ₦0
  const lateCentre = npcCatalogue.services.find((s) => s.slug === 'npc-centre-based-late-and-special-birth-registration');
  assert.equal(lateCentre.feeOptions[0].pricingModel, 'unknown');
  assert.equal(lateCentre.feeOptions[0].verificationStatus, 'pending');
  assert.equal(lateCentre.feeOptions[0].amount, null);

  const stillbirth = npcCatalogue.services.find((s) => s.slug === 'npc-stillbirth-registration');
  assert.equal(stillbirth.feeOptions[0].pricingModel, 'unknown');
  assert.equal(stillbirth.feeOptions[0].verificationStatus, 'pending');
  assert.equal(stillbirth.feeOptions[0].amount, null);

  // Verify provider publication dates are separated from lastChecked
  assert.equal(npcCatalogue.sources['npc-first-baby-2025-statement'].publicationDate, '2025-01-01');
  assert.equal(npcCatalogue.sources['npc-first-baby-2026-statement'].publicationDate, '2026-01-01');
  assert.equal(npcCatalogue.sources['npc-civil-registration-laws-2025-statement'].publicationDate, '2025-12-15');
  assert.equal(npcCatalogue.sources['npc-faqs-page'].publicationDate, null);
  assert.equal(npcCatalogue.sources['npc-vitalreg-selfservice-portal'].publicationDate, null);

  // Verify all active service action URLs point to live nationalpopulation.gov.ng / vitalreg-selfservice domains, not dead subdomains
  for (const service of npcCatalogue.services) {
    assert.equal(service.officialActionUrl.includes('birthreg-selfservice.nationalpopulation.gov.ng'), false);
    assert.equal(service.officialActionUrl.includes('attestation.nationalpopulation.gov.ng'), false);
  }
});

test('NPC manifest integration validates, preserves AGIS inactive status in Batch 2, and imports idempotently', async () => {
  const withNpc = validateManifest(buildNpcManifest(batch2Manifest, npcCatalogue));
  const agisMda = withNpc.mdas.find((mda) => mda.slug === 'agis');
  assert.equal(agisMda.coverageStatus, 'inactive', 'AGIS unpublishing decision must remain intact');

  const npcMda = withNpc.mdas.find((mda) => mda.slug === 'npc');
  assert.equal(npcMda.name, 'National Population Commission');
  assert.equal(npcMda.services.length, 11);
  const allNpcFeeOptions = npcMda.services.flatMap((service) => service.feeOptions);
  assert.equal(allNpcFeeOptions.length, 23);
  assert.equal(allNpcFeeOptions.filter((option) => option.verificationStatus === 'verified').length, 3);
  assert.equal(allNpcFeeOptions.filter((option) => option.verificationStatus === 'conflicting').length, 2);
  assert.equal(allNpcFeeOptions.filter((option) => option.verificationStatus === 'pending').length, 18);

  const loadedBatch2 = validateManifest(loadManifest(BATCH_02_MANIFEST_PATH));
  const report = dryRunReport(loadedBatch2, 'batch-02');
  assert.equal(report.mdaCount, 5);
  assert.equal(report.duplicateRiskCount, 0);
  assert.equal(report.writes, 0);

  const pool = fakePool();
  const first = await importBatch({ manifest: loadedBatch2, batch: 'batch-02', pool, actorAdminUserId: null });
  const second = await importBatch({ manifest: loadedBatch2, batch: 'batch-02', pool, actorAdminUserId: null });
  const expected = dryRunReport(loadedBatch2, 'batch-02');
  assert.equal(first.mdaCount, 5);
  assert.equal(first.serviceCount, expected.serviceCount);
  assert.equal(first.feeOptionCount, expected.feeOptionCount);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 0);
  assert.equal(second.linked, 0);
  assert.equal(second.verificationEvents, 0);

  // Verify markdown deliverables exist
  const matrixPath = path.resolve(__dirname, '../../research/npc-service-evidence-matrix.md');
  const protocolPath = path.resolve(__dirname, '../../docs/npc-verification-protocol-2026-10-31.md');
  assert.ok(fs.existsSync(matrixPath));
  assert.ok(fs.existsSync(protocolPath));
});
