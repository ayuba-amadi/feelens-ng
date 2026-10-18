const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../../research/production-import/batch-01-mdas.json');
const {
  dryRunReport,
  importBatch,
  selectBatch,
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
        const row = { id: nextId('mdas'), name: values[0], slug: values[1], acronym: values[2], description: values[3], website_url: values[4], coverage_status: values[5], is_active: values[6] };
        state.mdas.push(row); return { rows: [clone(row)] };
      }
      if (sql.startsWith('UPDATE mdas')) {
        const row = state.mdas.find((item) => item.id === values[6]);
        Object.assign(row, { name: values[0], acronym: values[1], description: values[2], website_url: values[3], coverage_status: values[4], is_active: values[5] });
        return { rows: [clone(row)] };
      }
      if (sql.startsWith('SELECT * FROM services')) return { rows: state.services.filter((row) => row.mda_id === values[0] && row.slug === values[1]).map(clone) };
      if (sql.startsWith('INSERT INTO services')) {
        const row = { id: nextId('services'), mda_id: values[0], name: values[1], slug: values[2], notes: values[8], is_active: values[9] };
        state.services.push(row); return { rows: [clone(row)] };
      }
      if (sql.startsWith('UPDATE services')) {
        const row = state.services.find((item) => item.id === values[2]);
        Object.assign(row, { name: values[0], notes: values[1], is_active: true });
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

test('apply path is idempotent, preserves conflicting fees, links evidence, creates channels and audit/history events', async () => {
  const pool = fakePool();
  const validated = validateManifest(manifest);
  const first = await importBatch({ manifest: validated, batch: 'batch-01', pool, actorAdminUserId: null });
  const second = await importBatch({ manifest: validated, batch: 'batch-01', pool, actorAdminUserId: null });
  assert.equal(first.mdaCount, 5);
  assert.equal(first.serviceCount, 25);
  assert.equal(first.officialChannelCount, 29);
  assert.equal(first.verificationEvents, 25);
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
  assert.equal(pool.state.verifications.length, 25);
  assert.ok(pool.state.audits.some((audit) => audit.action === 'import.channel.created'));
  assert.ok(pool.state.audits.some((audit) => audit.action === 'import.verification.created'));
  const conflictingService = pool.state.services.find((service) => service.slug === 'date-of-birth-modification');
  const conflictingFee = pool.state.fees.find((fee) => fee.service_id === conflictingService.id);
  assert.equal(conflictingFee.verification_status, 'conflicting');
  assert.equal(conflictingFee.amount, null);
  assert.equal(pool.state.fees.filter((fee) => fee.service_id === conflictingService.id).length, 1);
});
